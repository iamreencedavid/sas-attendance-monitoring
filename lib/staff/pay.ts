/** Largest amount numeric(10,2) holds, plus one centavo. */
export const MAX_PESOS = 100_000_000;

/** Blank, or pesos with up to 2 decimals: "650", "650.5", "650.50". */
export const PESO_INPUT = /^\d+(\.\d{1,2})?$/;

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** 650 → "₱650.00"; null → "Not set". */
export function formatPeso(amount: number | null): string {
  return amount === null ? "Not set" : peso.format(amount);
}

/** Value for a form field: 650 → "650.00", null → "". */
export function pesoInput(amount: number | null): string {
  return amount === null ? "" : amount.toFixed(2);
}
