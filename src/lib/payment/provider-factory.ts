/**
 * Payment provider factory.
 * Selects the correct PaymentProvider implementation based on currency:
 *   - INR  → Razorpay (optimised for Indian payments, UPI, etc.)
 *   - Everything else → Cashfree (international card/wallet support)
 */

import { RazorpayProvider } from './razorpay-provider';
import { CashfreeProvider } from './cashfree-provider';
import type { PaymentProvider } from './types';

/**
 * Returns the appropriate PaymentProvider for the given currency.
 *
 * @param currency - ISO 4217 currency code, e.g. "INR", "USD", "EUR"
 * @returns A PaymentProvider instance (RazorpayProvider or CashfreeProvider)
 */
export function getProvider(currency: string): PaymentProvider {
  if (currency === 'INR') {
    return new RazorpayProvider();
  }
  return new CashfreeProvider();
}

/**
 * Returns the string identifier of the provider for the given currency.
 * Useful for storing in the DB and routing webhook/verify calls.
 *
 * @param currency - ISO 4217 currency code
 * @returns "razorpay" | "cashfree"
 */
export function getProviderName(currency: string): 'razorpay' | 'cashfree' {
  return currency === 'INR' ? 'razorpay' : 'cashfree';
}
