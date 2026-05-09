import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: 'Password reset link has expired or is invalid' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark email as verified
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          emailVerified: new Date(), // Auto-verify email when resetting password
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
