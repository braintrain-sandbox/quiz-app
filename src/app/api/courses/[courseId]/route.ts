import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { coursesData } from '../../../../../prisma/data/courses';

export const dynamic = 'force-dynamic';

// GET /api/courses/[courseId] - Get course details with progress
export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { courseId } = params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get user progress if logged in
    if (session?.user) {
      const paidAccess = await prisma.payment.findFirst({
        where: {
          userId: session.user.id,
          courseId,
          status: 'PAID',
        },
        select: { id: true },
      });

      const progress = await prisma.topicProgress.findMany({
        where: {
          userId: session.user.id,
          courseId: courseId,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Determine which topics are unlocked
      let topicsWithStatus = course.topics.map((topic, index) => {
        const topicProgress = progress.find((p) => p.topicId === topic.id);
        const isCompleted = topicProgress?.isCompleted || false;

        // First topic is always unlocked
        let isUnlocked = index === 0;

        // Check if previous topic is completed
        if (index > 0) {
          const previousTopic = course.topics[index - 1];
          const previousProgress = progress.find(
            (p) => p.topicId === previousTopic.id
          );
          isUnlocked = previousProgress?.isCompleted || false;
        }

        return {
          ...topic,
          isCompleted,
          isUnlocked,
          bestScore: topicProgress?.bestScore || 0,
          attemptsCount: topicProgress?.attemptsCount || 0,
        };
      });

      // Check if all topics are completed for final quiz
      const allTopicsCompleted = topicsWithStatus.every((t) => t.isCompleted);
      const hasPaidAccess = Boolean(paidAccess);

      return NextResponse.json({
        ...course,
        topics: topicsWithStatus,
        hasPaidAccess,
        allTopicsCompleted,
        canTakeFinalQuiz: allTopicsCompleted && hasPaidAccess,
      });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);

    const fallbackCourse = coursesData.find((c) => c.id === params.courseId);

    if (!fallbackCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...fallbackCourse,
      isActive: true,
      topics: fallbackCourse.topics.map((topic, index) => ({
        ...topic,
        isActive: true,
        _count: { questions: 0 },
        isCompleted: false,
        isUnlocked: index === 0,
        bestScore: 0,
        attemptsCount: 0,
      })),
      hasPaidAccess: false,
      allTopicsCompleted: false,
      canTakeFinalQuiz: false,
    });
  }
}
