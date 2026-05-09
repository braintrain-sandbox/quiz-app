import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/progress - Get user progress across all courses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all courses with topics
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Get user's progress
    const topicProgress = await prisma.topicProgress.findMany({
      where: { userId: session.user.id },
    });

    // Get quiz attempts
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id },
    });

    // Build progress summary
    const progressSummary = courses.map((course) => {
      const courseTopics = course.topics;
      const completedTopics = courseTopics.filter((topic) =>
        topicProgress.some((p) => p.topicId === topic.id && p.isCompleted)
      );

      const courseAttempts = quizAttempts.filter((a) => a.courseId === course.id);
      const finalQuizAttempt = courseAttempts.find((a) => a.isFinalQuiz);
      const certificate = certificates.find((c) => c.courseId === course.id);

      const avgScore = courseAttempts.length > 0
        ? courseAttempts.reduce((sum, a) => sum + a.score, 0) / courseAttempts.length
        : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        slug: course.slug,
        totalTopics: courseTopics.length,
        completedTopics: completedTopics.length,
        progress: (completedTopics.length / courseTopics.length) * 100,
        averageScore: Math.round(avgScore),
        finalQuizTaken: !!finalQuizAttempt,
        finalQuizScore: finalQuizAttempt?.score || 0,
        hasCertificate: !!certificate,
        certificateId: certificate?.certificateId,
      };
    });

    return NextResponse.json({
      courses: progressSummary,
      totalQuizzesTaken: quizAttempts.length,
      totalCertificates: certificates.length,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);

    return NextResponse.json({
      courses: [],
      totalQuizzesTaken: 0,
      totalCertificates: 0,
      warning: 'Progress database is temporarily unavailable',
    });
  }
}
