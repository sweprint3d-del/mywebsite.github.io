import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { notifyOrder } from "../../lib/notify";

export const config = { api: { bodyParser: false } };

const prisma = new PrismaClient();

function ensureUploadsDir(dir = "./uploads") {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function parseForm(req: NextApiRequest, uploadDir: string) {
  const form = formidable({
    multiples: true,
    uploadDir,
    keepExtensions: true,
    maxFileSize: 20 * 1024 * 1024, // 20 MB/bild
  });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}
function toFileArray(input: formidable.File | formidable.File[] | undefined): formidable.File[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}
function makeOrderNumber(id: number, createdAt: Date, name: string): string {
  const year = createdAt.getFullYear();
  const padded = id.toString().padStart(6, "0");
  const cleanName = (name || "KUND").toUpperCase().replace(/[^A-ZÅÄÖ]/g, "").slice(0, 12) || "KUND";
  return `SP-${year}-${padded}-${cleanName}`;
}
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function uniqueFileName(baseDir: string, desired: string): string {
  const { name, ext } = path.parse(desired);
  let candidate = desired;
  let i = 2;
  while (fs.existsSync(path.join(baseDir, candidate))) {
    candidate = `${name}(${i})${ext}`;
    i++;
  }
  return candidate;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Endast POST stöds." });

  try {
    const uploadsDir = "./uploads";
    ensureUploadsDir(uploadsDir);
    const { fields, files } = await parseForm(req, uploadsDir);

    const name = String(fields.name || "").trim();
    const email = String(fields.email || "").trim();

    // Leveransuppgifter
    const addressLine1 = String(fields.addressLine1 || "").trim();
    const addressLine2 = String(fields.addressLine2 || "").trim() || null;
    const postalCode = String(fields.postalCode || "").trim();
    const city = String(fields.city || "").trim();
    const country = String(fields.country || "Sverige").trim();
    const phone = String(fields.phone || "").trim() || null;

    if (!name || !email || !addressLine1 || !postalCode || !city) {
      return res.status(400).json({ error: "Fyll i namn, e-post, adress, postnummer och ort." });
    }

    const imagesArr = toFileArray((files as any).images);
    if (imagesArr.length !== 4) return res.status(400).json({ error: "Du måste ladda upp exakt 4 bilder." });

    const price = 500;

    // Temp order number (schema requires unique)
    const tempOrderNumber = `TMP-${Date.now()}-${nanoid(6)}`;

    // 1) Create order & placeholder file rows
    let created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: tempOrderNumber, // temporary
          name,
          email,
          type: "lithophane",
          price,
          status: "Ny",
          addressLine1,
          addressLine2,
          postalCode,
          city,
          country,
          phone,
        },
      });

      // Create placeholder OrderFile rows with temporary (sanitized) names (without order prefix yet)
      for (const f of imagesArr) {
        const safeOrig = sanitizeFileName(f.originalFilename || path.basename(f.filepath));
        await tx.orderFile.create({
          data: {
            orderId: order.id,
            filename: safeOrig,
            token: nanoid(10),
          },
        });
      }

      return order;
    });

    // 2) Pretty order number
    const orderNumber = makeOrderNumber(created.id, created.createdAt, name);
    const order = await prisma.order.update({ where: { id: created.id }, data: { orderNumber } });

    // 3) Rename physical files to "<ORDERNUMBER>_<SANITIZED_ORIGINAL>" and update DB
    const dbFiles = await prisma.orderFile.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" } });

    const finalFiles: { filename: string; token: string }[] = [];
    for (let i = 0; i < dbFiles.length; i++) {
      const dbf = dbFiles[i];
      const uploadFile = imagesArr[i];

      const safeOrig = sanitizeFileName(uploadFile.originalFilename || path.basename(uploadFile.filepath));
      const desired = `${orderNumber}_${safeOrig}`;
      const finalName = uniqueFileName(uploadsDir, desired);
      const finalPath = path.join(uploadsDir, finalName);

      try {
        fs.renameSync(uploadFile.filepath, finalPath);
      } catch {
        fs.copyFileSync(uploadFile.filepath, finalPath);
        try { fs.unlinkSync(uploadFile.filepath); } catch {}
      }

      await prisma.orderFile.update({
        where: { id: dbf.id },
        data: { filename: finalName },
      });

      finalFiles.push({ filename: finalName, token: dbf.token });
    }

    // 4) Discord-notis (Lithophane = alltid PLA/vit)
    await notifyOrder({
      id: order.id,
      orderNumber,
      name,
      email,
      type: "lithophane",
      price,
      addressLine1,
      addressLine2,
      postalCode,
      city,
      country,
      phone,
      items: finalFiles.map((f) => ({
        filename: f.filename,
        token: f.token,
        material: "PLA",
        color: "vit",
        copies: 1,
        gramsEach: 0,
      })),
    });

    // 5) TXT-kvitto
    try {
      const lines: string[] = [];
      lines.push(`Order: ${orderNumber}`);
      lines.push(`Namn: ${name}`);
      lines.push(`E-post: ${email}`);
      lines.push(
        `Adress: ${addressLine1}${addressLine2 ? ", " + addressLine2 : ""}, ${postalCode} ${city}, ${country}`
      );
      lines.push(`Telefon: ${phone ?? "-"}`);
      lines.push("");
      lines.push("Lithophane-bilder:");
      for (const f of finalFiles) lines.push(`- ${f.token}  ${f.filename}  —  PLA/vit`);
      lines.push("");
      lines.push(`Fast pris: ${price} kr`);
      const txtPath = path.join(uploadsDir, `${orderNumber}.txt`);
      fs.writeFileSync(txtPath, lines.join("\n"), "utf8");
    } catch (e) {
      console.error("Kunde inte skriva TXT-kvitto (lithophane):", e);
    }

    return res.status(200).json({
      success: true,
      id: order.id,
      orderNumber,
      price,
    });
  } catch (err: any) {
    console.error("API /lithophane error:", err);
    return res.status(500).json({
      error:
        "Något gick fel vid uppladdning/beställning. Mejla gärna oss på carl.1224@outlook.com så hjälper vi dig.",
      details: process.env.NODE_ENV === "development" ? String(err?.message || err) : undefined,
    });
  }
}
