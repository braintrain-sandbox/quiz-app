import { NextResponse } from 'next/server';
import { detectCurrency } from '@/lib/payment/detect-currency';
import { getPriceForCurrency, getCurrencySymbol } from '@/lib/payment/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/payment/currency
 *
 * Detects the user's currency from their IP address and returns the
 * appropriate course price and symbol for that currency.
 *
 * Returns: { currency: string; price: number; symbol: string }
 */
export async function GET(request: Request) {
  try {
    const currency = await detectCurrency(request);
    const price = getPriceForCurrency(currency);
    const symbol = getCurrencySymbol(currency);

    return NextResponse.json({ currency, price, symbol });
  } catch (error) {
    console.error('Error detecting currency:', error);
    // Fail gracefully — return USD defaults
    return NextResponse.json({ currency: 'USD', price: 12, symbol: '$' });
  }
}
