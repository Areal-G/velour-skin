/**
 * Money helpers. All amounts are stored as integers in the currency's minor
 * unit (cents for USD: $1 = 100 cents) to avoid floating-point errors.
 */
export const STORE_CURRENCY = "USD";
export const STORE_LOCALE = "en-US";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale: string, wholeUnits: boolean): Intl.NumberFormat {
  const key = `${locale}:${currency}:${wholeUnits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...(wholeUnits ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats an integer amount in minor units (cents) as a currency string.
 * Whole amounts are shown without decimals ($68), as is conventional for
 * luxury retail pricing; fractional amounts keep their cents ($68.50).
 */
export function formatPrice(
  amountMinor: number,
  currency: string = STORE_CURRENCY,
  locale: string = STORE_LOCALE,
): string {
  if (!Number.isFinite(amountMinor)) throw new RangeError("Amount must be a finite number");
  const wholeUnits = Number.isInteger(amountMinor) && amountMinor % 100 === 0;
  return getFormatter(currency.toUpperCase(), locale, wholeUnits).format(amountMinor / 100);
}

/** Converts a major-unit amount (e.g. $12.50) to integer minor units (cents). */
export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError("Amount must be a finite number");
  return Math.round(amount * 100);
}

/** Converts integer minor units back to a major-unit number. */
export function fromMinorUnits(amountMinor: number): number {
  return amountMinor / 100;
}

/** Major-unit decimal string for structured data, e.g. `"68.00"`. */
export function toDecimalString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}
