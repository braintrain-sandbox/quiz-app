import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/quiz/topic/[topicId] - Get quiz questions for a topic
export async function GET(
  request: Request,
  { params }: { params: { topicId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { topicId } = params;

    // Get the topic and verify it exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        course: {
          include: {
            topics: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // Check if topic is unlocked (previous topic completed)
    const topicIndex = topic.course.topics.findIndex((t) => t.id === topicId);
    
    if (topicIndex > 0) {
      const previousTopic = topic.course.topics[topicIndex - 1];
      const previousProgress = await prisma.topicProgress.findUnique({
        where: {
          userId_topicId: {
            userId: session.user.id,
            topicId: previousTopic.id,
          },
        },
      });

      if (!previousProgress?.isCompleted) {
        return NextResponse.json(
          { error: 'Previous topic must be completed first' },
          { status: 403 }
        );
      }
    }

    // Get all questions for this topic
    const questions = await prisma.question.findMany({
      where: {
        topicId: topicId,
        isActive: true,
      },
      select: {
        id: true,
        question: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
        difficulty: true,
        tags: true,
      },
    });

    // Shuffle questions for variety
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      topicId,
      courseId: topic.courseId,
      topicTitle: topic.title,
      questions: shuffledQuestions,
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
      { status: 500 }
    );
  }
}
