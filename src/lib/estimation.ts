// Beräknar volym från STL/OBJ (mm³) och gör om till gram med densitet & fyllnadsfaktor.
// Fungerar för:
//  - STL binary & ASCII
//  - OBJ med trianglar (eller polygoner som triangel-fanas)
//
// Obs: Om modellen inte är vattentät kan volym bli fel. Vi använder abs(signedVolume).
// Vi antar att enheter är millimeter (vanligast för STL).

import fs from "fs";

export type VolumeResult = {
  volumeMm3: number;           // modellvolym i mm³
  grams: number;               // beräknad vikt i gram
};

const DEFAULT_FILL_FACTOR = Number(process.env.FILL_FACTOR || "0.25"); // 25% infill som standard
const MIN_GRAMS_PER_FILE = Number(process.env.MIN_GRAMS_PER_FILE || "5"); // lägsta rimliga vikt per fil (säkerhetsmin)

const DENSITY_G_CM3: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  ASA: 1.07,
  TPU: 1.21,
};

function dot(a: number[], b: number[]) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross(a: number[], b: number[]) {
  return [ a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];
}
function triSignedVolume(p1: number[], p2: number[], p3: number[]) {
  return dot(p1, cross(p2, p3)) / 6.0;
}

function parseStlBinary(buf: Buffer): number {
  // header(80) + uint32 triCount + each tri(50 bytes)
  if (buf.length < 84) return 0;
  const triCount = buf.readUInt32LE(80);
  let off = 84;
  let sum = 0;
  for (let i = 0; i < triCount; i++) {
    // normal (ignored): 12 bytes
    // v1, v2, v3: each 12 bytes (float32 x,y,z)
    const v1 = [buf.readFloatLE(off+12), buf.readFloatLE(off+16), buf.readFloatLE(off+20)];
    const v2 = [buf.readFloatLE(off+24), buf.readFloatLE(off+28), buf.readFloatLE(off+32)];
    const v3 = [buf.readFloatLE(off+36), buf.readFloatLE(off+40), buf.readFloatLE(off+44)];
    sum += triSignedVolume(v1, v2, v3);
    off += 50;
    if (off > buf.length) break;
  }
  return Math.abs(sum); // mm³ (om filen är i mm)
}

function parseStlAscii(txt: string): number {
  // mycket enkel parser: letar upp tripplar av "vertex x y z"
  const lines = txt.split(/\r?\n/);
  let verts: number[][] = [];
  let sum = 0;
  for (const line of lines) {
    const m = line.trim().match(/^vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/);
    if (m) {
      verts.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
      if (verts.length === 3) {
        sum += triSignedVolume(verts[0], verts[1], verts[2]);
        verts = [];
      }
    }
  }
  return Math.abs(sum);
}

function isProbablyBinarySTL(buf: Buffer): boolean {
  if (buf.length < 84) return false;
  const header = buf.slice(0, 80).toString("utf8");
  if (header.startsWith("solid")) {
    // kan fortfarande vara binary (vissa binary börjar med 'solid'), kontrollera storlek
    const tri = buf.readUInt32LE(80);
    const expected = 84 + tri * 50;
    return expected === buf.length ? true : false;
  }
  return true; // oftast binary
}

function parseObjVolume(txt: string): number {
  // OBJ antas triangulerad; polygoner delas som tri-fan (v1, v2, v3+) -> triangel-lista
  const vs: number[][] = [];
  let sum = 0;

  const lines = txt.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const [, xs, ys, zs] = line.split(/\s+/);
      vs.push([parseFloat(xs), parseFloat(ys), parseFloat(zs)]);
    } else if (line.startsWith("f ")) {
      const parts = line.split(/\s+/).slice(1);
      const idxs = parts.map(p => {
        const i = p.split("/")[0]; // ta bara vertex-index
        const n = parseInt(i, 10);
        return n > 0 ? n - 1 : vs.length + n; // stöd för negativa index
      });
      for (let i = 1; i + 1 < idxs.length; i++) {
        const p1 = vs[idxs[0]];
        const p2 = vs[idxs[i]];
        const p3 = vs[idxs[i + 1]];
        if (p1 && p2 && p3) sum += triSignedVolume(p1, p2, p3);
      }
    }
  }
  return Math.abs(sum);
}

export function estimateFromFile(filePath: string, material: string): VolumeResult {
  const mat = (material || "PLA").toUpperCase();
  const density = DENSITY_G_CM3[mat] ?? DENSITY_G_CM3["PLA"]; // g/cm³
  const fill = DEFAULT_FILL_FACTOR;

  const buf = fs.readFileSync(filePath);
  let volumeMm3 = 0;

  // Heuristik: STL vs OBJ
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".stl")) {
    if (isProbablyBinarySTL(buf)) volumeMm3 = parseStlBinary(buf);
    else volumeMm3 = parseStlAscii(buf.toString("utf8"));
  } else if (lower.endsWith(".obj")) {
    volumeMm3 = parseObjVolume(buf.toString("utf8"));
  } else {
    volumeMm3 = 0;
  }

  const volumeCm3 = volumeMm3 / 1000.0; // mm³ -> cm³
  const gramsSolid = volumeCm3 * density; // g vid 100% fyllning
  const grams = Math.max(gramsSolid * fill, MIN_GRAMS_PER_FILE);

  return { volumeMm3, grams };
}
