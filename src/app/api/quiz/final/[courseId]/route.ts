import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/quiz/final/[courseId] - Get final quiz questions for a course
export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { courseId } = params;

    // Check if all topics in the course are completed
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check completion status of all topics
    const topicProgress = await prisma.topicProgress.findMany({
      where: {
        userId: session.user.id,
        courseId: courseId,
      },
    });

    const allTopicsCompleted = course.topics.every((topic) =>
      topicProgress.some((p) => p.topicId === topic.id && p.isCompleted)
    );

    if (!allTopicsCompleted) {
      return NextResponse.json(
        { error: 'All topics must be completed before taking the final quiz' },
        { status: 403 }
      );
    }

    // Get questions from all topics with balanced difficulty
    const allQuestions = await prisma.question.findMany({
      where: {
        courseId: courseId,
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
        topicId: true,
      },
    });

    // Balance by difficulty
    const easyQuestions = allQuestions.filter((q) => q.difficulty === 'EASY');
    const mediumQuestions = allQuestions.filter((q) => q.difficulty === 'MEDIUM');
    const hardQuestions = allQuestions.filter((q) => q.difficulty === 'HARD');

    // Select questions: 30% easy, 50% medium, 20% hard
    const targetTotal = Math.min(allQuestions.length, 100);
    const numEasy = Math.floor(targetTotal * 0.3);
    const numMedium = Math.floor(targetTotal * 0.5);
    const numHard = targetTotal - numEasy - numMedium;

    const selectedQuestions = [
      ...easyQuestions.sort(() => Math.random() - 0.5).slice(0, numEasy),
      ...mediumQuestions.sort(() => Math.random() - 0.5).slice(0, numMedium),
      ...hardQuestions.sort(() => Math.random() - 0.5).slice(0, numHard),
    ].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      courseId,
      courseTitle: course.title,
      questions: selectedQuestions,
      isFinalQuiz: true,
    });
  } catch (error) {
    console.error('Error fetching final quiz:', error);
    return NextResponse.json(
      { error: 'Failed to fetch final quiz' },
      { status: 500 }
    );
  }
}
