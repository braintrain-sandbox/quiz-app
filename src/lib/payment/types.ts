/**
 * Payment provider abstraction types.
 * All payment providers must conform to the PaymentProvider interface.
 */

/** Input required to create a payment order with any provider */
export interface CreateOrderInput {
  /** Internal user ID from our database */
  userId: string;
  /** Internal course ID from our database */
  courseId: string;
  /** ISO 4217 currency code, e.g. "INR", "USD", "EUR" */
  currency: string;
  /** Amount in the smallest unit of the currency (e.g. paise for INR, cents for USD) */
  amount: number;
  /** Optional customer name */
  userName?: string;
  /** Optional customer email */
  userEmail?: string;
}

/** Normalised response returned from createOrder() regardless of provider */
export interface OrderResponse {
  /** The provider's order ID (used for verification later) */
  orderId: string;
  /** Amount in smallest currency unit, as returned by the provider */
  amount: number;
  /** ISO 4217 currency code confirmed by the provider */
  currency: string;
  /**
   * Provider-specific data needed by the frontend checkout SDK.
   * For Razorpay: { key_id }
   * For Cashfree: { paymentSessionId }
   */
  providerData: Record<string, string | number>;
}

/** Input required to verify/confirm a completed payment */
export interface VerifyInput {
  /** The provider's order ID */
  orderId: string;
  /** Which gateway processed this payment: "razorpay" | "cashfree" */
  provider: string;
  /** The payment transaction ID returned by the provider after payment */
  paymentId: string;
  /** HMAC signature (required for Razorpay, optional for Cashfree) */
  signature?: string;
  /** Raw webhook payload for webhook-driven verification (optional) */
  webhookData?: Record<string, unknown>;
}

/** Result returned from verifyPayment() */
export interface VerifyResult {
  /** Whether the payment is confirmed as successful */
  success: boolean;
  /** Human-readable status message */
  message: string;
  /** The real transaction/payment ID from the provider (if available) */
  providerPaymentId?: string;
}

/**
 * Contract every payment provider must implement.
 * Both Razorpay and Cashfree wrap their SDKs/APIs behind this interface.
 */
export interface PaymentProvider {
  /**
   * Creates a new payment order on the provider's platform.
   * Returns the order metadata needed to launch the frontend checkout.
   */
  createOrder(input: CreateOrderInput): Promise<OrderResponse>;

  /**
   * Verifies that a completed payment is authentic and not tampered with.
   * Returns whether the payment is confirmed as successful.
   */
  verifyPayment(input: VerifyInput): Promise<VerifyResult>;
}
