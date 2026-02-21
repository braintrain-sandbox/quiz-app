import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/courses - Get all courses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const courses = await prisma.course.findMany({
      where: { isActive: true },
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
        _count: {
          select: { topics: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // If user is logged in, include progress
    if (session?.user) {
      const progress = await prisma.topicProgress.findMany({
        where: { userId: session.user.id },
      });

      const coursesWithProgress = courses.map((course) => ({
        ...course,
        topics: course.topics.map((topic) => {
          const topicProgress = progress.find((p) => p.topicId === topic.id);
          return {
            ...topic,
            isCompleted: topicProgress?.isCompleted || false,
            bestScore: topicProgress?.bestScore || 0,
            attemptsCount: topicProgress?.attemptsCount || 0,
          };
        }),
      }));

      return NextResponse.json(coursesWithProgress);
    }

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
