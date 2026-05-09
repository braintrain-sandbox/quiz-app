import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: name || null,
        password: hashedPassword,
      },
      create: {
        name: name || null,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified. Please sign in.' },
        { status: 400 }
      );
    }

    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expires,
      },
    });

    const verificationUrl = `${getBaseUrl()}/api/auth/verify-email?token=${rawToken}`;

    await sendVerificationEmail({
      to: user.email,
      verificationUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
