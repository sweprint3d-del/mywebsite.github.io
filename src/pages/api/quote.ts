import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { estimateFromFile } from "../../lib/estimation";
import { priceCartBreakdown } from "../../lib/pricing";

export const config = { api: { bodyParser: false } };
const ALLOWED_3D_EXT = new Set([".stl", ".obj"]);
const MAX_FILE_SIZE = 1000 * 1024 * 1024;

function ensureDir(dir: string) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function parseForm(req: NextApiRequest, uploadDir: string) {
  const form = formidable({ multiples: true, uploadDir, keepExtensions: true, maxFileSize: MAX_FILE_SIZE });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}
function toArray<T>(v: T | T[] | undefined): T[] { if (!v) return []; return Array.isArray(v) ? v : [v]; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Endast POST." });
  try {
    ensureDir("./uploads/tmp");
    const { fields, files } = await parseForm(req, "./uploads/tmp");

    const upFiles = toArray((files as any).files);
    if (upFiles.length === 0) return res.status(400).json({ error: "Ladda upp minst en STL/OBJ-fil." });

    const meta = JSON.parse(String(fields.itemsMeta || "[]"));
    if (!Array.isArray(meta) || meta.length !== upFiles.length) {
      return res.status(400).json({ error: "itemsMeta saknas eller matchar inte antal filer." });
    }

    const entries = [];
    for (let i = 0; i < upFiles.length; i++) {
      const f = upFiles[i];
      const m = meta[i] || {};
      const ext = path.extname(f.originalFilename || "").toLowerCase();
      if (!ALLOWED_3D_EXT.has(ext)) return res.status(400).json({ error: `Endast STL/OBJ: ${f.originalFilename}` });
      if (f.size > MAX_FILE_SIZE) return res.status(400).json({ error: `Filen är för stor: ${f.originalFilename}` });

      const est = estimateFromFile(f.filepath, m.material || "PLA");
      entries.push({
        index: i,
        name: f.originalFilename || path.basename(f.filepath),
        material: String(m.material || "PLA"),
        color: String(m.color || "white"),
        copies: Math.max(parseInt(String(m.copies || "1"), 10), 1),
        gramsEach: est.grams,
      });
    }

    const breakdown = priceCartBreakdown(entries, upFiles.length);

    // cleanup temp files
    for (const f of upFiles) { try { fs.unlinkSync(f.filepath); } catch {} }

    return res.status(200).json({ breakdown });
  } catch (e: any) {
    console.error("/api/quote error:", e);
    return res.status(500).json({ error: "Kunde inte beräkna offert." });
  }
}
