/**
 * Static pricing map for each supported currency.
 * Update these values to change course prices globally.
 */

/** Price of the course in each supported currency (major units, e.g. dollars not cents) */
const PRICES: Record<string, number> = {
  INR: Number(process.env.COURSE_PRICE_INR),
  USD: 12,
  EUR: 11,
  GBP: 10,
  AUD: 18,
  CAD: 16,
};

/** Currency code → display symbol mapping */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
};

/**
 * Returns the course price in major currency units for the given currency.
 * Falls back to the USD price if the currency is not in the pricing map.
 *
 * @param currency - ISO 4217 currency code, e.g. "INR", "USD"
 * @returns Price in major units (e.g. 12 for $12)
 */
export function getPriceForCurrency(currency: string): number {
  return PRICES[currency] ?? PRICES['USD'];
}

/**
 * Converts a major-unit price to the smallest currency unit (e.g. paise, cents).
 * Both Razorpay and Cashfree's internal representation use smallest units,
 * but Cashfree's REST API expects major units — convert back as needed per-provider.
 *
 * @param price - Price in major units (e.g. 12)
 * @returns Price in smallest unit (e.g. 1200 for $12)
 */
export function toSmallestUnit(price: number): number {
  return Math.round(price * 100);
}

/**
 * Returns the display symbol for a given currency code.
 * Falls back to "$" for unknown currencies.
 *
 * @param currency - ISO 4217 currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? '$';
}
