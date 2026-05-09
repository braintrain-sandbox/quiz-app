/**
 * Razorpay payment provider implementation.
 * Wraps the existing Razorpay order creation and signature verification logic
 * behind the PaymentProvider interface without changing any verification behaviour.
 */

import { createHmac } from 'crypto';
import { getRazorpayInstance } from '@/lib/razorpay';
import type {
  CreateOrderInput,
  OrderResponse,
  PaymentProvider,
  VerifyInput,
  VerifyResult,
} from './types';

export class RazorpayProvider implements PaymentProvider {
  /**
   * Creates a Razorpay order.
   * Amount must be passed in the smallest currency unit (paise for INR).
   * Returns the Razorpay order ID and the public key_id needed by the frontend.
   */
  async createOrder(input: CreateOrderInput): Promise<OrderResponse> {
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      // Razorpay expects amount already in smallest unit
      amount: input.amount,
      currency: input.currency,
      receipt: `course_${input.courseId}_${Date.now()}`,
      notes: {
        courseId: input.courseId,
        userId: input.userId,
      },
    });

    const normalizedAmount =
      typeof order.amount === 'string' ? Number(order.amount) : order.amount;

    if (!Number.isFinite(normalizedAmount)) {
      throw new Error('Invalid amount returned by Razorpay');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId) {
      throw new Error('RAZORPAY_KEY_ID is not configured');
    }

    return {
      orderId: order.id,
      amount: normalizedAmount,
      currency: order.currency,
      providerData: {
        key_id: keyId,
      },
    };
  }

  /**
   * Verifies a Razorpay payment by recomputing the HMAC-SHA256 signature
   * over "<orderId>|<paymentId>" and comparing it to the client-supplied value.
   * This logic is identical to the original verification route — only wrapped.
   */
  async verifyPayment(input: VerifyInput): Promise<VerifyResult> {
    if (!input.signature) {
      return { success: false, message: 'Razorpay signature is required' };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET is not configured');
    }

    const generatedSignature = createHmac('sha256', keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === input.signature;

    return {
      success: isValid,
      message: isValid
        ? 'Razorpay payment verified successfully'
        : 'Invalid Razorpay payment signature',
    };
  }
}
