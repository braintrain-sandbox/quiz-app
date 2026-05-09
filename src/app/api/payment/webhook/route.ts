import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// ── Types ────────────────────────────────────────────────────────────────────

/** Razorpay webhook event envelope */
interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
      };
    };
  };
}

/** Cashfree webhook event data */
interface CashfreeWebhookEvent {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
    };
  };
}

// ── Razorpay webhook handler ─────────────────────────────────────────────────

/**
 * Validates and processes a Razorpay webhook event.
 * Signature is verified using HMAC-SHA256 over the raw body.
 */
async function handleRazorpayWebhook(
  rawBody: string,
  signature: string,
): Promise<NextResponse> {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Razorpay webhook secret is not configured' },
      { status: 500 },
    );
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid Razorpay signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  const paymentEntity = event.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  if (!orderId || !paymentId) {
    return NextResponse.json({ received: true });
  }

  if (event.event === 'payment.captured') {
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: 'PAID',
        paymentId,
        paidAt: new Date(),
        source: 'WEBHOOK',
      },
    });
  }

  if (event.event === 'payment.failed') {
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: 'FAILED',
        paymentId,
        source: 'WEBHOOK',
      },
    });
  }

  return NextResponse.json({ received: true });
}

// ── Cashfree webhook handler ─────────────────────────────────────────────────

/**
 * Validates and processes a Cashfree webhook event.
 * Signature is verified using HMAC-SHA256 over the raw body with CASHFREE_SECRET_KEY.
 * Handles: PAYMENT_SUCCESS_WEBHOOK and PAYMENT_FAILED_WEBHOOK event types.
 */
async function handleCashfreeWebhook(
  rawBody: string,
  signature: string,
): Promise<NextResponse> {
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Cashfree secret key is not configured' },
      { status: 500 },
    );
  }

  // Cashfree signs the raw JSON body with HMAC-SHA256
  const expectedSignature = createHmac('sha256', secretKey)
    .update(rawBody)
    .digest('base64');

  if (expectedSignature !== signature) {
    return NextResponse.json({ error: 'Invalid Cashfree signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as CashfreeWebhookEvent;
  const orderId = event.data?.order?.order_id;
  const paymentId = String(event.data?.payment?.cf_payment_id ?? '');
  const paymentStatus = event.data?.payment?.payment_status;

  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  if (event.type === 'PAYMENT_SUCCESS_WEBHOOK' || paymentStatus === 'SUCCESS') {
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: 'PAID',
        paymentId: paymentId || undefined,
        paidAt: new Date(),
        source: 'WEBHOOK',
      },
    });
  }

  if (event.type === 'PAYMENT_FAILED_WEBHOOK' || paymentStatus === 'FAILED') {
    await prisma.payment.updateMany({
      where: { orderId },
      data: {
        status: 'FAILED',
        paymentId: paymentId || undefined,
        source: 'WEBHOOK',
      },
    });
  }

  return NextResponse.json({ received: true });
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/payment/webhook
 *
 * Unified webhook endpoint for both Razorpay and Cashfree.
 * Routing is determined by the `x-webhook-source` header:
 *   - "cashfree" → Cashfree webhook handler
 *   - anything else / absent → Razorpay webhook handler (backward compatible)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const webhookSource = request.headers.get('x-webhook-source');

    if (webhookSource === 'cashfree') {
      // Cashfree sends the HMAC signature in x-webhook-signature
      const cashfreeSignature = request.headers.get('x-webhook-signature') ?? '';
      return handleCashfreeWebhook(rawBody, cashfreeSignature);
    }

    // Default: Razorpay (preserves existing behaviour)
    const razorpaySignature = request.headers.get('x-razorpay-signature');
    if (!razorpaySignature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    return handleRazorpayWebhook(rawBody, razorpaySignature);
  } catch (error) {
    console.error('Error handling payment webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}
