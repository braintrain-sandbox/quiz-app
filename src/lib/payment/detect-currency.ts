/**
 * Geo-based currency detection.
 * Reads the client IP from request headers and maps the country to a currency.
 * All detection logic runs server-side only.
 */

/** Response shape from ip-api.com */
interface IpApiResponse {
  countryCode?: string;
  status?: string;
}

/** Maps ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // South Asia
  IN: 'INR',
  // North America
  US: 'USD',
  CA: 'CAD',
  // Eurozone members (subset)
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  IE: 'EUR',
  GR: 'EUR',
  LU: 'EUR',
  // United Kingdom
  GB: 'GBP',
  // Oceania
  AU: 'AUD',
  NZ: 'AUD',
};

/**
 * Extracts the real client IP from the request.
 * Falls back through common proxy headers before using a placeholder.
 */
function extractClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    // x-forwarded-for may be a comma-separated list; the first entry is the client
    return xff.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // Fallback: localhost / unknown — will result in USD default
  return '8.8.8.8';
}

/**
 * Detects the most appropriate billing currency for the incoming request
 * by geo-locating the client IP via ip-api.com.
 *
 * @param request - The incoming Next.js Request object
 * @returns ISO 4217 currency code, e.g. "INR", "USD", "EUR"
 */
export async function detectCurrency(request: Request): Promise<string> {
  try {
    const ip = extractClientIp(request);
    const apiUrl = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,status`;

    const response = await fetch(apiUrl, { cache: 'no-store' });
    if (!response.ok) return 'USD';

    const data = (await response.json()) as IpApiResponse;

    if (data.status !== 'success' || !data.countryCode) return 'USD';

    return COUNTRY_TO_CURRENCY[data.countryCode] ?? 'USD';
  } catch {
    // Network errors, JSON parse failures — default to USD
    return 'USD';
  }
}
