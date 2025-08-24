import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { estimateFromFile } from "../../lib/estimation";
import { priceCartBreakdown } from "../../lib/pricing";
import { notifyOrder } from "../../lib/notify";

export const config = { api: { bodyParser: false } };

const prisma = new PrismaClient();
const ALLOWED_3D_EXT = new Set([".stl", ".obj"]);
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function parseForm(req: NextApiRequest, uploadDir: string) {
  const form = formidable({ multiples: true, uploadDir, keepExtensions: true, maxFileSize: MAX_FILE_SIZE });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}
function toArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
function makeOrderNumber(id: number, createdAt: Date, name: string): string {
  const year = createdAt.getFullYear();
  const padded = id.toString().padStart(6, "0");
  const clean = (name || "KUND").toUpperCase().replace(/[^A-ZÅÄÖ]/g, "").slice(0, 12) || "KUND";
  return `SP-${year}-${padded}-${clean}`;
}
function sanitizeFileName(name: string): string {
  // Keep letters/digits, dot, underscore, dash; replace others with underscore
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function uniqueFileName(baseDir: string, desired: string): string {
  // If "<desired>" exists, try "desired(2).ext", "(3)", ...
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
  if (req.method !== "POST") return res.status(405).json({ error: "Endast POST." });

  try {
    const uploadsDir = "./uploads";
    ensureDir(uploadsDir);
    const { fields, files } = await parseForm(req, uploadsDir);

    // customer
    const name = String(fields.name || "").trim();
    const email = String(fields.email || "").trim();
    const addressLine1 = String(fields.addressLine1 || "").trim();
    const addressLine2 = String(fields.addressLine2 || "").trim() || null;
    const postalCode = String(fields.postalCode || "").trim();
    const city = String(fields.city || "").trim();
    const country = String(fields.country || "Sverige").trim();
    const phone = String(fields.phone || "").trim() || null;

    if (!name || !email || !addressLine1 || !postalCode || !city) {
      return res.status(400).json({ error: "Fyll i namn, e-post, adress, postnummer och ort." });
    }

    // files + meta
    const upFiles = toArray((files as any).files);
    if (upFiles.length === 0) return res.status(400).json({ error: "Ladda upp minst en STL/OBJ-fil." });

    const meta = JSON.parse(String(fields.itemsMeta || "[]"));
    if (!Array.isArray(meta) || meta.length !== upFiles.length) {
      return res.status(400).json({ error: "itemsMeta saknas eller matchar inte antal filer." });
    }

    // validate & estimate (use temporary paths from formidable for estimation)
    const entries = [];
    for (let i = 0; i < upFiles.length; i++) {
      const f = upFiles[i];
      const m = meta[i] || {};
      const origName = f.originalFilename || path.basename(f.filepath);
      const ext = path.extname(origName).toLowerCase();
      if (!ALLOWED_3D_EXT.has(ext)) return res.status(400).json({ error: `Endast STL/OBJ: ${origName}` });
      if (f.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: `Filen "${origName}" är för stor (max 100 MB). Kontakta carl.1224@outlook.com för en lösning.`,
        });
      }

      const est = estimateFromFile(f.filepath, m.material || "PLA");
      const copies = Math.max(parseInt(String(m.copies || "1"), 10), 1);

      entries.push({
        index: i,
        tempPath: f.filepath, // path where formidable wrote the upload
        originalName: origName,
        material: String(m.material || "PLA"),
        color: String(m.color || "white"),
        copies,
        gramsEach: est.grams,
      });
    }

    const breakdown = priceCartBreakdown(
      entries.map((e) => ({
        index: e.index,
        name: e.originalName,
        material: e.material,
        color: e.color,
        copies: e.copies,
        gramsEach: e.gramsEach,
      })),
      upFiles.length
    );
    const price = breakdown.total;

    // create order with temp orderNumber (required/unique), then pretty-fy
    const tempOrderNumber = `TMP-${Date.now()}-${nanoid(6)}`;

    // 1) Create order & placeholder file rows (with temporary filenames)
    let created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: tempOrderNumber,
          name,
          email,
          type: "standard",
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

      // Create placeholder records (we'll update filenames after final name is known)
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        await tx.orderFile.create({
          data: {
            orderId: order.id,
            filename: sanitizeFileName(e.originalName), // temp (without order prefix yet)
            token: nanoid(10),
          },
        });
      }

      return order;
    });

    // 2) Compute pretty order number
    const orderNumber = makeOrderNumber(created.id, created.createdAt, name);
    const order = await prisma.order.update({ where: { id: created.id }, data: { orderNumber } });

    // 3) Move/rename physical files to "<ORDERNUMBER>_<SANITIZED_ORIGINAL>"
    //    and update DB filenames to the final names.
    const dbFiles = await prisma.orderFile.findMany({
      where: { orderId: order.id },
      orderBy: { id: "asc" },
    });

    const finalFiles: { filename: string; token: string; meta: (typeof entries)[number] }[] = [];

    for (let i = 0; i < dbFiles.length; i++) {
      const dbf = dbFiles[i];
      const metaE = entries[i];

      const safeOrig = sanitizeFileName(metaE.originalName);
      const desired = `${orderNumber}_${safeOrig}`;
      const finalName = uniqueFileName(uploadsDir, desired);
      const finalPath = path.join(uploadsDir, finalName);

      // Move (rename) from temp path to final path
      try {
        fs.renameSync(metaE.tempPath, finalPath);
      } catch {
        // fallback copy+unlink if rename across devices fails
        fs.copyFileSync(metaE.tempPath, finalPath);
        try { fs.unlinkSync(metaE.tempPath); } catch {}
      }

      // Update DB record with final filename
      await prisma.orderFile.update({
        where: { id: dbf.id },
        data: { filename: finalName },
      });

      finalFiles.push({ filename: finalName, token: dbf.token, meta: metaE });
    }

    // 4) Notify Discord with final filenames
    await notifyOrder({
      id: order.id,
      orderNumber,
      name,
      email,
      type: "standard",
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
        material: f.meta.material,
        color: f.meta.color,
        copies: f.meta.copies,
        gramsEach: Math.round(f.meta.gramsEach),
      })),
    });

    // 5) Write TXT receipt in /uploads with final filenames
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
      lines.push("Objekt:");
      for (const f of finalFiles) {
        lines.push(
          `- ${f.token}  ${f.filename}  —  ${f.meta.material}/${f.meta.color} × ${f.meta.copies}  (~${Math.round(
            f.meta.gramsEach
          )} g/ea)`
        );
      }
      lines.push("");
      lines.push(`Materialkostnad: ${breakdown.materialCost} kr`);
      lines.push(`Filavgift: ${breakdown.fileFee} kr`);
      lines.push(`Frakt: ${breakdown.shipping} kr`);
      lines.push(`Totalt: ${price} kr`);
      const txtPath = path.join(uploadsDir, `${orderNumber}.txt`);
      fs.writeFileSync(txtPath, lines.join("\n"), "utf8");
    } catch (e) {
      console.error("Kunde inte skriva TXT-kvitto:", e);
    }

    return res.status(200).json({ success: true, id: order.id, orderNumber, price, breakdown });
  } catch (e: any) {
    console.error("/api/order error:", e);
    return res.status(500).json({ error: "Något gick fel vid beställning." });
  }
}
