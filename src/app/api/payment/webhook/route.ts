import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/payment/webhook - Razorpay webhook receiver
export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
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
    };

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
  } catch (error) {
    console.error('Error handling Razorpay webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
