'use client';

import { useEffect, useState } from 'react';
import PaymentSuccessToast from '@/components/PaymentSuccessToast';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutButtonProps {
  courseId: string;
  courseTitle: string;
  userName?: string | null;
  userEmail?: string | null;
  onPaymentSuccess?: () => void | Promise<void>;
}

type PaymentVerificationResponse = {
  success?: boolean;
  message?: string;
  invoiceStatus?: 'payment_only' | 'invoice_created' | 'invoice_emailed' | 'already_verified';
  warning?: string | null;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

function getSuccessCopy(result: PaymentVerificationResponse) {
  switch (result.invoiceStatus) {
    case 'invoice_emailed':
      return {
        title: 'Payment successful',
        message: result.message || 'Invoice emailed successfully.',
      };
    case 'invoice_created':
      return {
        title: 'Payment successful',
        message: result.message || 'Invoice created successfully.',
      };
    case 'already_verified':
      return {
        title: 'Payment already verified',
        message: result.message || 'This payment had already been verified earlier.',
      };
    default:
      return {
        title: 'Payment successful',
        message: result.message || 'Your payment was verified successfully.',
      };
  }
}

export default function RazorpayCheckoutButton({
  courseId,
  courseTitle,
  userName,
  userEmail,
  onPaymentSuccess,
}: RazorpayCheckoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Payment successful');
  const [successMessage, setSuccessMessage] = useState('Your payment was verified and your invoice has been generated.');

  useEffect(() => {
    if (!successOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessOpen(false);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [successOpen]);

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleCheckout = async () => {
    try {
      setIsProcessing(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Could not load Razorpay checkout. Please try again.');
        return;
      }

      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      if (!RAZORPAY_KEY_ID) {
        throw new Error('Public Razorpay key is not configured');
      }

      const paymentObject = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AI Career Quiz Platform',
        description: `Purchase access for ${courseTitle}`,
        order_id: orderData.order_id,
        prefill: {
          name: userName || '',
          email: userEmail || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response: RazorpayResponse) {
          const verifyResponse = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = (await verifyResponse.json()) as PaymentVerificationResponse;
          if (!verifyResponse.ok || !verifyData.success) {
            alert('Payment verification failed. Please contact support.');
            return;
          }

          if (onPaymentSuccess) {
            await onPaymentSuccess();
          }

          const successCopy = getSuccessCopy(verifyData);
          setSuccessTitle(successCopy.title);
          setSuccessMessage(successCopy.message);
          setSuccessOpen(true);
        },
      });

      paymentObject.open();
    } catch (error) {
      console.error('Razorpay checkout error:', error);
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={isProcessing}
        className={`rounded-lg px-8 py-3 font-semibold transition-colors ${
          isProcessing
            ? 'cursor-not-allowed bg-gray-300 text-gray-500'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
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
