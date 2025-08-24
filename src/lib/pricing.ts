export const MATERIAL_COST_PER_GRAM: Record<string, number> = {
  PLA: 0.5,
  PETG: 0.5,
  ABS: 1,
  ASA: 1,
  TPU: 3,
};

const POSTNORD_BANDS: Array<{ limit: number; price: number }> = [
  { limit: 50, price: 22 },
  { limit: 100, price: 44 },
  { limit: 250, price: 66 },
  { limit: 500, price: 88 },
  { limit: 1000, price: 132 },
  { limit: 2000, price: 154 },
];

const PACKAGING_GRAMS = Number(process.env.PACKAGING_GRAMS || "30");

export function shippingForWeight(totalGrams: number): number {
  const w = Math.ceil(totalGrams);
  for (const band of POSTNORD_BANDS) if (w <= band.limit) return band.price;
  return POSTNORD_BANDS[POSTNORD_BANDS.length - 1].price;
}

export type CartEntry = {
  index: number;
  name: string;
  material: string;
  color: string;
  copies: number;
  gramsEach: number; // from estimation
};

export function priceCartBreakdown(entries: CartEntry[], uniqueFileCount: number) {
  let materialCost = 0;
  const items: Array<{
    index: number; name: string; material: string; color: string; copies: number;
    gramsEach: number; gramsTotal: number; perGram: number; materialCost: number;
  }> = [];

  let totalGrams = 0;

  for (const it of entries) {
    const mat = (it.material || "PLA").toUpperCase();
    const perGram = MATERIAL_COST_PER_GRAM[mat] ?? MATERIAL_COST_PER_GRAM["PLA"];
    const gramsTotal = Math.round(it.gramsEach * it.copies);
    const cost = Math.round(it.gramsEach * perGram) * it.copies;

    totalGrams += gramsTotal;
    materialCost += cost;

    items.push({
      index: it.index,
      name: it.name,
      material: mat,
      color: it.color,
      copies: it.copies,
      gramsEach: Math.round(it.gramsEach),
      gramsTotal,
      perGram,
      materialCost: cost,
    });
  }
  
  const baseFee = Number(process.env.START_FEE || 50);

  const fileFee = Math.max(uniqueFileCount - 1, 0) * 10;
  const shipping = shippingForWeight(totalGrams + PACKAGING_GRAMS);
  const total = baseFee + materialCost + fileFee + shipping;

  return {
    grams: totalGrams,
    packagingGrams: PACKAGING_GRAMS,
    materialCost,
    fileFee,
    baseFee,
    shipping,
    total,
    items,
  };
}
