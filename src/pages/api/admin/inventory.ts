import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { ALL_COLORS } from "../../../lib/colors";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // list whole inventory (grouped by material)
    const rows = await prisma.inventory.findMany();
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { material, color, available } = req.body || {};
    if (typeof material !== "string" || typeof color !== "string" || typeof available !== "boolean") {
      return res.status(400).json({ error: "material, color och available krävs" });
    }
    const up = await prisma.inventory.upsert({
      where: { material_color: { material: material.toUpperCase(), color } },
      update: { available },
      create: { material: material.toUpperCase(), color, available },
    });
    return res.status(200).json(up);
  }

  if (req.method === "PUT") {
    // bulk set for one material: body { material, colorsAvailable: string[] }
    const { material, colorsAvailable } = req.body || {};
    if (typeof material !== "string" || !Array.isArray(colorsAvailable)) {
      return res.status(400).json({ error: "material och colorsAvailable[] krävs" });
    }
    const mat = material.toUpperCase();
    // Upsert all colors for that material
    await Promise.all(
      ALL_COLORS.map(c =>
        prisma.inventory.upsert({
          where: { material_color: { material: mat, color: c.value } },
          update: { available: colorsAvailable.includes(c.value) },
          create: { material: mat, color: c.value, available: colorsAvailable.includes(c.value) },
        })
      )
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "GET/POST/PUT stöds." });
}
