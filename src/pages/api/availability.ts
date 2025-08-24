import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { ALL_COLORS } from "../../lib/colors";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const material = String(req.query.material || "PLA").toUpperCase();
  try {
    const rows = await prisma.inventory.findMany({
      where: { material },
    });
    // If no rows yet for this material, assume all colors are available by default:
    const map = new Map(rows.map(r => [r.color, r.available]));
    const list = ALL_COLORS.filter(c => map.size === 0 ? true : (map.get(c.value) ?? false));
    res.status(200).json(list);
  } catch (e: any) {
    console.error("availability error:", e);
    res.status(500).json({ error: "Kunde inte hämta tillgängliga färger." });
  }
}
