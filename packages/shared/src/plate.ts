/** Plates are stored uppercase and without whitespace, e.g. 34ABC123 */
export function normalizePlate(raw: string): string {
  return raw
    .toLocaleUpperCase("tr-TR")
    .replace(/[\s.-]/g, "")
    .trim();
}

export function isValidPlate(raw: string): boolean {
  const plate = normalizePlate(raw);
  return /^[0-9]{2}[A-ZÇĞİÖŞÜ]{1,3}[0-9]{2,4}$/.test(plate);
}
