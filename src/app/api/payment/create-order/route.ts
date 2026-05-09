import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { detectCurrency } from '@/lib/payment/detect-currency';
import { getPriceForCurrency, toSmallestUnit } from '@/lib/payment/pricing';
import { getProvider, getProviderName } from '@/lib/payment/provider-factory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/payment/create-order
 *
 * Creates a payment order using the provider appropriate for the user's currency.
 * If currency is not supplied, it is auto-detected from the request IP.
 * Saves a PENDING Payment record in the DB before returning provider data.
 *
 * Body: { courseId: string; currency?: string }
 * Returns: { orderId, amount, currency, provider, providerData }
 */
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

    const body = await request.json() as { courseId?: string; currency?: string };
    const { courseId } = body;
    let { currency } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 },
      );
    }

    // Validate the course exists and is active
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true },
    });

    if (!course || !course.isActive) {
      return NextResponse.json(
        { error: 'Course not found or inactive' },
        { status: 404 },
      );
    }

    // Auto-detect currency from IP if not provided by the client
    if (!currency) {
      currency = await detectCurrency(request);
    }

    // Normalise to uppercase just in case
    currency = currency.toUpperCase();

    // Get price and convert to smallest unit (paise / cents)
    const majorUnitPrice = getPriceForCurrency(currency);
    if (!Number.isFinite(majorUnitPrice) || majorUnitPrice <= 0) {
      return NextResponse.json(
        { error: 'Price configuration error for the selected currency' },
        { status: 500 },
      );
    }

    const amountSmallestUnit = toSmallestUnit(majorUnitPrice);

    // Select the right payment gateway
    const provider = getProvider(currency);
    const providerName = getProviderName(currency);

    const orderResponse = await provider.createOrder({
      userId,
      courseId,
      currency,
      amount: amountSmallestUnit,
      userName: session.user?.name || undefined,
      userEmail: session.user?.email || undefined,
    });

    // Persist a PENDING payment record so we can reconcile later
    await prisma.payment.create({
      data: {
        userId,
        courseId,
        orderId: orderResponse.orderId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        provider: providerName,
        status: 'CREATED',
      },
    });

    return NextResponse.json({
      orderId: orderResponse.orderId,
      amount: orderResponse.amount,
      currency: orderResponse.currency,
      provider: providerName,
      providerData: orderResponse.providerData,
      // Legacy field aliases for the existing Razorpay frontend component
      order_id: orderResponse.orderId,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 },
    );
  }
}
