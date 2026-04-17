import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRazorpayInstance } from '@/lib/razorpay';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// POST /api/payment/create-order - Create a Razorpay order for checkout
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId } = body as { courseId?: string };

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true },
    });

    if (!course || !course.isActive) {
      return NextResponse.json(
        { error: 'Course not found or inactive' },
        { status: 404 }
      );
    }

    const configuredAmount = Number(process.env.COURSE_PRICE_INR);
    if (!Number.isFinite(configuredAmount) || configuredAmount <= 0) {
      return NextResponse.json(
        { error: 'COURSE_PRICE_INR is not configured correctly' },
        { status: 500 }
      );
    }

    const amountInRupees = configuredAmount;

    const amountInPaise = Math.round(amountInRupees * 100);

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `course_${courseId}_${Date.now()}`,
      notes: {
        courseId,
        userId,
      },
    });

    const normalizedAmount = typeof order.amount === 'string'
      ? Number(order.amount)
      : order.amount;

    if (!Number.isFinite(normalizedAmount)) {
      throw new Error('Invalid amount returned by Razorpay');
    }

    await prisma.payment.create({
      data: {
        userId,
        courseId,
        orderId: order.id,
        amount: normalizedAmount,
        currency: order.currency,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
