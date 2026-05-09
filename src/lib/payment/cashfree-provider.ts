/**
 * Cashfree payment provider implementation.
 * All API calls are made server-side only — keys are never exposed to the browser.
 * Uses Cashfree PG REST API v2023-08-01.
 */

import type {
  CreateOrderInput,
  OrderResponse,
  PaymentProvider,
  VerifyInput,
  VerifyResult,
} from './types';

/** Successful order creation response from Cashfree */
interface CashfreeOrderResponse {
  cf_order_id?: string;
  order_id?: string;
  payment_session_id?: string;
  order_status?: string;
  message?: string;
}

/** Single payment object returned by Cashfree's payments listing endpoint */
interface CashfreePaymentEntity {
  payment_status?: string;
  cf_payment_id?: number;
  order_id?: string;
}

/** Returns the Cashfree base URL depending on the CASHFREE_ENV env var */
function getCashfreeBaseUrl(): string {
  const env = process.env.CASHFREE_ENV ?? 'sandbox';
  return env === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

/** Returns the headers required for every Cashfree API call */
function getCashfreeHeaders(): Record<string, string> {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;

  if (!appId || !secretKey) {
    throw new Error('CASHFREE_APP_ID or CASHFREE_SECRET_KEY is not configured');
  }

  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': appId,
    'x-client-secret': secretKey,
  };
}

export class CashfreeProvider implements PaymentProvider {
  /**
   * Creates a Cashfree order via POST /pg/orders.
   * Returns the paymentSessionId needed by the Cashfree JS SDK to open checkout.
   * Amount must be in the major currency unit (e.g. dollars, not cents).
   */
  async createOrder(input: CreateOrderInput): Promise<OrderResponse> {
    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();

    // Cashfree expects amount in major unit (e.g. 12.00 USD, not 1200)
    const majorUnitAmount = input.amount / 100;

    const body = JSON.stringify({
      order_id: `cf_${input.courseId}_${Date.now()}`,
      order_amount: majorUnitAmount,
      order_currency: input.currency,
      customer_details: {
        customer_id: input.userId,
        customer_phone: '8888888888', // Required field
        customer_email: input.userEmail || 'test@example.com',
        customer_name: input.userName || 'Test User',
      },
      order_meta: {
        notify_url: process.env.NEXTAUTH_URL
          ? `${process.env.NEXTAUTH_URL}/api/payment/webhook`
          : undefined,
      },
    });

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    const data = (await response.json()) as CashfreeOrderResponse;

    if (!response.ok || !data.payment_session_id) {
      throw new Error(
        `Cashfree order creation failed: ${data.message ?? `HTTP ${response.status}`}`,
      );
    }

    return {
      orderId: data.order_id ?? `cf_${input.courseId}_${Date.now()}`,
      amount: input.amount,
      currency: input.currency,
      providerData: {
        paymentSessionId: data.payment_session_id,
      },
    };
  }

  /**
   * Verifies a Cashfree payment by fetching the payment status from
   * GET /pg/orders/{order_id}/payments and checking for a SUCCESS status.
   * No client-supplied signature is required — the API response is authoritative.
   */
  async verifyPayment(input: VerifyInput): Promise<VerifyResult> {
    const baseUrl = getCashfreeBaseUrl();
    const headers = getCashfreeHeaders();

    const response = await fetch(
      `${baseUrl}/orders/${encodeURIComponent(input.orderId)}/payments`,
      {
        method: 'GET',
        headers,
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      return {
        success: false,
        message: `Cashfree verification request failed: HTTP ${response.status}`,
      };
    }

    const payments = (await response.json()) as CashfreePaymentEntity[];

    // A payment is successful when at least one entry has status SUCCESS
    const successPayment = Array.isArray(payments)
      ? payments.find((p) => p.payment_status === 'SUCCESS')
      : null;

    const succeeded = !!successPayment;

    return {
      success: succeeded,
      message: succeeded
        ? 'Cashfree payment verified successfully'
        : 'Cashfree payment not yet confirmed or failed',
      providerPaymentId: successPayment?.cf_payment_id?.toString(),
    };
  }
}
