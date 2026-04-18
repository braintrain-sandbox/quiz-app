import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getSignInUrlWithVerifiedFlag(request: Request) {
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXTAUTH_URL || `${requestUrl.protocol}//${requestUrl.host}`;
  // Redirect to dashboard instead of signin page after verification
  return `${baseUrl}/dashboard?verified=1`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_token', request.url));
    }

    const tokenHash = hashToken(token);

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/auth/signin?error=invalid_token', request.url));
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.redirect(new URL('/auth/signin?error=expired_token', request.url));
    }

    // Update user and delete token in a transaction
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    });

    await prisma.emailVerificationToken.deleteMany({
      where: { userId: verificationToken.userId },
    });

    return NextResponse.redirect(getSignInUrlWithVerifiedFlag(request));
  } catch (error) {
    console.error('Email verification error:', error);
    console.error('Full error:', JSON.stringify(error));
    return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', request.url));
  }
}
