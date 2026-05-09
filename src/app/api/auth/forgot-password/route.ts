import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Don't reveal if user exists (security best practice)
      // Return success anyway to prevent user enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
      });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expires,
      },
    });

    // Send reset email
    const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${rawToken}`;
    
    try {
      await sendVerificationEmail({
        to: user.email,
        verificationUrl: resetUrl,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request, token is still valid
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
