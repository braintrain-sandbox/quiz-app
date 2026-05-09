'use client';

import { useEffect, useState } from 'react';
import PaymentSuccessToast from '@/components/PaymentSuccessToast';

// ── Type declarations ─────────────────────────────────────────────────────────

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
    // Cashfree SDK exposed globally after the script loads
    Cashfree: (config: { mode: string }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: string;
      }) => Promise<{ error?: { message: string }; paymentDetails?: unknown }>;
    };
  }
}

interface CreateOrderApiResponse {
  orderId: string;
  order_id: string; // legacy alias
  amount: number;
  currency: string;
  provider: 'razorpay' | 'cashfree';
  providerData: {
    key_id?: string;
    paymentSessionId?: string;
  };
}

interface VerifyApiResponse {
  success?: boolean;
  message?: string;
  invoiceStatus?: 'payment_only' | 'invoice_created' | 'invoice_emailed' | 'already_verified';
}

interface CurrencyApiResponse {
  currency: string;
  price: number;
  symbol: string;
}

interface PaymentCheckoutButtonProps {
  courseId: string;
  courseTitle: string;
  userName?: string | null;
  userEmail?: string | null;
  onPaymentSuccess?: () => void | Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSuccessCopy(result: VerifyApiResponse) {
  switch (result.invoiceStatus) {
    case 'invoice_emailed':
      return { title: 'Payment successful', message: result.message || 'Invoice emailed.' };
    case 'invoice_created':
      return { title: 'Payment successful', message: result.message || 'Invoice created.' };
    case 'already_verified':
      return { title: 'Already verified', message: result.message || 'This payment was already verified.' };
    default:
      return { title: 'Payment successful', message: result.message || 'Your payment was verified.' };
  }
}

/** Dynamically loads a script tag and resolves true on success */
function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Unified checkout button that adapts to the user's currency:
 *  - INR users  → Razorpay checkout modal
 *  - Other users → Cashfree checkout flow
 *
 * Fetches localised pricing from /api/payment/currency on mount.
 */
export default function PaymentCheckoutButton({
  courseId,
  courseTitle,
  userName,
  userEmail,
  onPaymentSuccess,
}: PaymentCheckoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Payment successful');
  const [successMessage, setSuccessMessage] = useState('Your payment was verified.');
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyApiResponse>({
    currency: 'INR',
    price: 0,
    symbol: '₹',
  });

  // Fetch localised currency + price on mount
  useEffect(() => {
    fetch('/api/payment/currency')
      .then((res) => res.json())
      .then((data: CurrencyApiResponse) => setCurrencyInfo(data))
      .catch(() => {
        // Silently fall back to INR defaults
      });
  }, []);

  // Auto-dismiss the success toast
  useEffect(() => {
    if (!successOpen) return;
    const id = window.setTimeout(() => setSuccessOpen(false), 4500);
    return () => window.clearTimeout(id);
  }, [successOpen]);

  // ── Razorpay flow ───────────────────────────────────────────────────────────

  async function openRazorpayCheckout(order: CreateOrderApiResponse) {
    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!loaded) throw new Error('Could not load Razorpay checkout. Please try again.');

    const keyId = order.providerData.key_id ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) throw new Error('Razorpay public key is not configured');

    return new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'AI Career Quiz Platform',
        description: `Purchase access for ${courseTitle}`,
        order_id: order.orderId,
        prefill: { name: userName ?? '', email: userEmail ?? '' },
        theme: { color: '#2563eb' },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = (await verifyRes.json()) as VerifyApiResponse;

            if (!verifyRes.ok || !verifyData.success) {
              reject(new Error('Payment verification failed. Please contact support.'));
              return;
            }

            if (onPaymentSuccess) await onPaymentSuccess();
            const copy = getSuccessCopy(verifyData);
            setSuccessTitle(copy.title);
            setSuccessMessage(copy.message);
            setSuccessOpen(true);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      });
      rzp.open();
    });
  }

  // ── Cashfree flow ───────────────────────────────────────────────────────────

  async function openCashfreeCheckout(order: CreateOrderApiResponse) {
    const loaded = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
    if (!loaded) throw new Error('Could not load Cashfree checkout. Please try again.');

    const paymentSessionId = order.providerData.paymentSessionId;
    if (!paymentSessionId) throw new Error('Payment session ID missing from Cashfree order');

    const cashfreeEnv = (process.env.NEXT_PUBLIC_CASHFREE_ENV ?? 'sandbox') as 'sandbox' | 'production';
    const cashfree = window.Cashfree({ mode: cashfreeEnv });

    const result = await cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_self',
    });

    if (result.error) {
      throw new Error(result.error.message || 'Cashfree checkout failed');
    }

    // Cashfree redirects on success; if we reach here in an embedded mode, verify manually
    const verifyRes = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.orderId,
        payment_id: `cashfree_pending_${Date.now()}`,
        provider: 'cashfree',
      }),
    });
    const verifyData = (await verifyRes.json()) as VerifyApiResponse;

    if (!verifyRes.ok || !verifyData.success) {
      throw new Error('Payment verification failed. Please contact support.');
    }

    if (onPaymentSuccess) await onPaymentSuccess();
    const copy = getSuccessCopy(verifyData);
    setSuccessTitle(copy.title);
    setSuccessMessage(copy.message);
    setSuccessOpen(true);
  }

  // ── Main checkout handler ────────────────────────────────────────────────────

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, currency: currencyInfo.currency }),
      });

      const orderData = (await orderRes.json()) as CreateOrderApiResponse;
      if (!orderRes.ok) {
        throw new Error((orderData as unknown as { error: string }).error || 'Failed to create payment order');
      }

      if (orderData.provider === 'cashfree') {
        await openCashfreeCheckout(orderData);
      } else {
        await openRazorpayCheckout(orderData);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const displayPrice =
    currencyInfo.price > 0
      ? `${currencyInfo.symbol}${currencyInfo.price}`
      : 'Pay Now';

  return (
    <>
      <button
        id="payment-checkout-btn"
        onClick={handleCheckout}
        disabled={isProcessing}
        className={`rounded-lg px-8 py-3 font-semibold transition-colors ${
          isProcessing
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {isProcessing ? 'Processing...' : `Pay ${displayPrice}`}
      </button>

      <PaymentSuccessToast
        open={successOpen}
        title={successTitle}
        message={successMessage}
        onClose={() => setSuccessOpen(false)}
      />
    </>
  );
}
