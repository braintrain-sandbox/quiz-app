import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

type PaymentVerificationOutcome = 'payment_only' | 'invoice_created' | 'invoice_emailed' | 'already_verified';

type ZohoOAuthTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type ZohoContactListResponse = {
  code?: number;
  message?: string;
  contacts?: Array<{
    contact_id?: string;
    email?: string;
    contact_name?: string;
  }>;
};

type ZohoCreateContactResponse = {
  code?: number;
  message?: string;
  contact?: {
    contact_id?: string;
  };
};

type ZohoCreateInvoiceResponse = {
  code?: number;
  message?: string;
  invoice?: {
    invoice_id?: string;
    invoice_number?: string;
  };
};

type ZohoEmailInvoiceResponse = {
  code?: number;
  message?: string;
};

const ZOHO_TOKEN_URL = process.env.ZOHO_OAUTH_TOKEN_URL || 'https://accounts.zoho.in/oauth/v2/token';
const ZOHO_INVOICE_BASE_URL = process.env.ZOHO_INVOICE_API_BASE_URL || 'https://invoice.zoho.in/api/v3';

function logZohoFailure(operation: string, details: Record<string, unknown>) {
  console.error(`Zoho API failure during ${operation}:`, details);
}

function getZohoEnv() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const organizationId = process.env.ZOHO_ORGANIZATION_ID;

  if (!clientId || !clientSecret || !refreshToken || !organizationId) {
    return null;
  }

  return { clientId, clientSecret, refreshToken, organizationId };
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getZohoAccessToken(zohoEnv: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const params = new URLSearchParams({
    client_id: zohoEnv.clientId,
    client_secret: zohoEnv.clientSecret,
    refresh_token: zohoEnv.refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
  });

  const data = await parseJsonSafely<ZohoOAuthTokenResponse>(response);
  if (!response.ok || !data?.access_token) {
    logZohoFailure('token refresh', {
      status: response.status,
      body: data,
    });
    const reason = data?.error_description || data?.error || 'Unable to generate Zoho access token';
    throw new Error(reason);
  }

  return data.access_token;
}

async function findZohoContactByEmail(args: {
  accessToken: string;
  organizationId: string;
  email: string;
}) {
  const url = `${ZOHO_INVOICE_BASE_URL}/contacts?organization_id=${encodeURIComponent(args.organizationId)}&email_contains=${encodeURIComponent(args.email)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
    },
    cache: 'no-store',
  });

  const data = await parseJsonSafely<ZohoContactListResponse>(response);
  if (!response.ok || !data || data.code !== 0) {
    return null;
  }

  const matched = (data.contacts || []).find((contact) => {
    return contact.email?.toLowerCase() === args.email.toLowerCase();
  });

  return matched?.contact_id || null;
}

async function createCustomer(args: {
  accessToken: string;
  organizationId: string;
  userName: string;
  userEmail: string;
}) {
  const url = `${ZOHO_INVOICE_BASE_URL}/contacts?organization_id=${encodeURIComponent(args.organizationId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contact_name: args.userName,
      email: args.userEmail,
    }),
    cache: 'no-store',
  });

  const data = await parseJsonSafely<ZohoCreateContactResponse>(response);
  if (!response.ok || !data || data.code !== 0 || !data.contact?.contact_id) {
    logZohoFailure('contact creation', {
      status: response.status,
      body: data,
      userEmail: args.userEmail,
    });
    const reason = data?.message || `HTTP ${response.status}`;
    throw new Error(`Zoho contact creation failed: ${reason}`);
  }

  return data.contact.contact_id;
}

async function createInvoice(args: {
  accessToken: string;
  organizationId: string;
  customerId: string;
  itemName: string;
  amountInInr: number;
}) {
  const url = `${ZOHO_INVOICE_BASE_URL}/invoices?organization_id=${encodeURIComponent(args.organizationId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer_id: args.customerId,
      line_items: [
        {
          name: args.itemName,
          rate: args.amountInInr,
          quantity: 1,
        },
      ],
    }),
    cache: 'no-store',
  });

  const data = await parseJsonSafely<ZohoCreateInvoiceResponse>(response);
  if (!response.ok || !data || data.code !== 0 || !data.invoice?.invoice_id) {
    logZohoFailure('invoice creation', {
      status: response.status,
      body: data,
      customerId: args.customerId,
      amountInInr: args.amountInInr,
    });
    const reason = data?.message || `HTTP ${response.status}`;
    throw new Error(`Zoho invoice creation failed: ${reason}`);
  }

  return {
    invoiceId: data.invoice.invoice_id,
    invoiceNumber: data.invoice.invoice_number || null,
  };
}

async function emailInvoice(args: {
  accessToken: string;
  organizationId: string;
  invoiceId: string;
  recipientEmail: string;
}) {
  const url = `${ZOHO_INVOICE_BASE_URL}/invoices/${encodeURIComponent(args.invoiceId)}/email?send_attachment=true`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${args.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      send_from_org_email_id: false,
      to_mail_ids: [args.recipientEmail],
    }),
    cache: 'no-store',
  });

  const data = await parseJsonSafely<ZohoEmailInvoiceResponse>(response);
  if (!response.ok || !data || data.code !== 0) {
    logZohoFailure('invoice email', {
      status: response.status,
      body: data,
      invoiceId: args.invoiceId,
      recipientEmail: args.recipientEmail,
    });
    const reason = data?.message || `HTTP ${response.status}`;
    throw new Error(`Zoho invoice email failed: ${reason}`);
  }

  return data.message || 'Your invoice has been sent.';
}

async function ensureZohoCustomer(args: {
  userId: string;
  accessToken: string;
  organizationId: string;
  userName: string;
  userEmail: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { zohoContactId: true },
  });

  if (user?.zohoContactId) {
    return user.zohoContactId;
  }

  const existingContactId = await findZohoContactByEmail({
    accessToken: args.accessToken,
    organizationId: args.organizationId,
    email: args.userEmail,
  });

  const contactId = existingContactId || (await createCustomer({
    accessToken: args.accessToken,
    organizationId: args.organizationId,
    userName: args.userName,
    userEmail: args.userEmail,
  }));

  await prisma.user.updateMany({
    where: {
      id: args.userId,
      zohoContactId: null,
    },
    data: {
      zohoContactId: contactId,
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { zohoContactId: true },
  });

  if (!updatedUser?.zohoContactId) {
    throw new Error('Unable to persist Zoho contact id for user');
  }

  return updatedUser.zohoContactId;
}

/**
 * POST /api/payment/verify
 *
 * Verifies a payment from either Razorpay or Cashfree.
 * Routes to the correct provider based on the `provider` field stored in the
 * Payment DB record (set at order creation time).
 *
 * Body (Razorpay):  { order_id, payment_id, razorpay_signature }
 * Body (Cashfree):  { order_id, payment_id, provider: "cashfree" }
 *
 * On success: marks Payment as PAID and runs Zoho invoice in background.
 * Idempotent: if Payment is already PAID with the same paymentId, returns 200 immediately.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      order_id?: string;
      payment_id?: string;
      razorpay_signature?: string;
      provider?: string;
    };

    const { order_id, payment_id } = body;
    const razorpay_signature = body.razorpay_signature;

    if (!order_id || !payment_id) {
      return NextResponse.json(
        { error: 'order_id and payment_id are required' },
        { status: 400 },
      );
    }

    // Load the stored payment record to know which provider handled this order
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId: order_id },
      select: {
        id: true,
        userId: true,
        status: true,
        paymentId: true,
        zohoInvoiceId: true,
        amount: true,
        currency: true,
        provider: true,
        course: { select: { title: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingPayment) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existingPayment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Idempotency guard: already verified → return silently
    if (existingPayment.status === 'PAID' && existingPayment.paymentId === payment_id) {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified',
        invoiceStatus: 'already_verified' as PaymentVerificationOutcome,
        payment_id,
        order_id,
        zohoInvoiceId: existingPayment.zohoInvoiceId,
      });
    }

    // ── Determine which provider to use ──────────────────────────────────────
    // Prefer the value stored in DB; fall back to the value sent by the client.
    const providerName = existingPayment.provider || body.provider || 'razorpay';

    let verificationPassed = false;

    if (providerName === 'razorpay') {
      // ── Razorpay: verify HMAC-SHA256 signature ────────────────────────────
      if (!razorpay_signature) {
        return NextResponse.json(
          { error: 'razorpay_signature is required for Razorpay payments' },
          { status: 400 },
        );
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return NextResponse.json(
          { error: 'Razorpay secret key not configured' },
          { status: 500 },
        );
      }

      const generatedSignature = createHmac('sha256', keySecret)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');

      verificationPassed = generatedSignature === razorpay_signature;

      if (!verificationPassed) {
        await prisma.payment.update({
          where: { orderId: order_id },
          data: {
            status: 'FAILED',
            paymentId: payment_id,
            signature: razorpay_signature,
          },
        });

        return NextResponse.json(
          { success: false, error: 'Invalid Razorpay payment signature' },
          { status: 400 },
        );
      }

      // Mark Razorpay payment as paid
      await prisma.payment.update({
        where: { orderId: order_id },
        data: {
          status: 'PAID',
          paymentId: payment_id,
          signature: razorpay_signature,
          paidAt: new Date(),
          source: 'CHECKOUT',
        },
      });
    } else if (providerName === 'cashfree') {
      // ── Cashfree: verify by fetching payment status from Cashfree API ──────
      // Import here to avoid loading Cashfree code for Razorpay-only requests
      const { CashfreeProvider } = await import('@/lib/payment/cashfree-provider');
      const cashfreeProvider = new CashfreeProvider();

      const result = await cashfreeProvider.verifyPayment({
        orderId: order_id,
        provider: 'cashfree',
        paymentId: payment_id,
      });

      const realPaymentId = result.providerPaymentId || payment_id;

      if (!verificationPassed) {
        await prisma.payment.update({
          where: { orderId: order_id },
          data: { 
            status: 'FAILED', 
            // Only set paymentId if it's not a generic placeholder
            paymentId: realPaymentId !== 'cashfree_pending' ? realPaymentId : undefined 
          },
        });

        return NextResponse.json(
          { success: false, error: result.message },
          { status: 400 },
        );
      }

      // Mark Cashfree payment as paid
      await prisma.payment.update({
        where: { orderId: order_id },
        data: {
          status: 'PAID',
          paymentId: realPaymentId,
          paidAt: new Date(),
          source: 'CHECKOUT',
        },
      });
    } else {
      return NextResponse.json(
        { error: `Unknown payment provider: ${providerName}` },
        { status: 400 },
      );
    }

    // ── Return success immediately; Zoho runs in the background ──────────────
    const immediateResponse = {
      success: true,
      message: 'Payment verified successfully. Course unlocked!',
      invoiceStatus: 'payment_only' as PaymentVerificationOutcome,
      payment_id,
      order_id,
    };

    // ⚡ Fire-and-forget Zoho invoice creation so course unlocks instantly
    (async () => {
      try {
        const zohoEnv = getZohoEnv();
        if (!zohoEnv) {
          console.warn('Zoho is not fully configured, skipping invoice generation');
          return;
        }

        // Idempotency: skip if invoice already created
        const latestPayment = await prisma.payment.findUnique({
          where: { orderId: order_id },
          select: { zohoInvoiceId: true },
        });

        if (latestPayment?.zohoInvoiceId) {
          console.log('Invoice already exists for payment:', order_id);
          return;
        }

        const accessToken = await getZohoAccessToken(zohoEnv);
        const userEmail = existingPayment.user.email;

        if (!userEmail) {
          throw new Error('User email is required to create Zoho contact');
        }

        const userName = existingPayment.user.name?.trim() || userEmail;

        const customerId = await ensureZohoCustomer({
          userId: existingPayment.user.id,
          accessToken,
          organizationId: zohoEnv.organizationId,
          userName,
          userEmail,
        });

        const amountInInr =
          existingPayment.currency === 'INR'
            ? Number((existingPayment.amount / 100).toFixed(2))
            : existingPayment.amount;

        const itemName = `${existingPayment.course.title} Course Purchase`;
        const invoice = await createInvoice({
          accessToken,
          organizationId: zohoEnv.organizationId,
          customerId,
          itemName,
          amountInInr,
        });

        await prisma.payment.update({
          where: { orderId: order_id },
          data: { zohoInvoiceId: invoice.invoiceId },
        });

        try {
          await emailInvoice({
            accessToken,
            organizationId: zohoEnv.organizationId,
            invoiceId: invoice.invoiceId,
            recipientEmail: userEmail,
          });
          console.log('✅ Invoice emailed successfully for payment:', order_id);
        } catch (emailError) {
          console.error('Zoho invoice email failed:', {
            orderId: order_id,
            paymentId: payment_id,
            invoiceId: invoice.invoiceId,
            recipientEmail: userEmail,
            error: emailError,
          });
        }
      } catch (zohoError) {
        console.error('Zoho integration failed in background:', {
          orderId: order_id,
          paymentId: payment_id,
          error: zohoError,
        });
      }
    })();

    return NextResponse.json(immediateResponse);
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 },
    );
  }
}
