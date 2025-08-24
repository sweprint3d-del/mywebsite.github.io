export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_DIMENSION = 256; // mm

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return "Filen är för stor (max 100 MB). Kontakta carl.1224@outlook.com.";
  }
  return null;
}

export function validateDimensions(width: number, height: number, depth: number): string | null {
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || depth > MAX_DIMENSION) {
    return "Modellen är för stor för BambuLab P1S. Kontakta carl.1224@outlook.com.";
  }
  return null;
}
