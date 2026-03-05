import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/quiz/submit - Submit quiz answers
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { topicId, courseId, answers, timeTaken, isFinalQuiz, questionIds } = body;

    // Get questions to calculate score
    let questions;
    if (isFinalQuiz) {
      // Get questions from all topics in the course
      questions = await prisma.question.findMany({
        where: {
          courseId: courseId,
          isActive: true,
        },
      });
    } else {
      questions = await prisma.question.findMany({
        where: {
          topicId: topicId,
          isActive: true,
        },
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const questionResults = questions.map((q) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        questionId: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty,
      };
    });

    // Sort results to match the order questions were presented to the user
    if (questionIds && Array.isArray(questionIds)) {
      questionResults.sort((a, b) => {
        const indexA = questionIds.indexOf(a.questionId);
        const indexB = questionIds.indexOf(b.questionId);
        return indexA - indexB;
      });
    }

    const totalQuestions = questions.length;
    const score = (correctAnswers / totalQuestions) * 100;

    // Save quiz attempt
    const quizAttempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        topicId: isFinalQuiz ? null : topicId,
        isFinalQuiz: isFinalQuiz || false,
        score,
        totalQuestions,
        correctAnswers,
        timeTaken,
        answers: answers,
      },
    });

    // Update topic progress if not final quiz
    if (!isFinalQuiz && topicId) {
      const existingProgress = await prisma.topicProgress.findUnique({
        where: {
          userId_topicId: {
            userId: session.user.id,
            topicId: topicId,
          },
        },
      });

      if (existingProgress) {
        await prisma.topicProgress.update({
          where: {
            userId_topicId: {
              userId: session.user.id,
              topicId: topicId,
            },
          },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            bestScore: Math.max(existingProgress.bestScore, score),
            attemptsCount: existingProgress.attemptsCount + 1,
          },
        });
      } else {
        await prisma.topicProgress.create({
          data: {
            userId: session.user.id,
            topicId: topicId,
            courseId: courseId,
            isCompleted: true,
            completedAt: new Date(),
            bestScore: score,
            attemptsCount: 1,
          },
        });
      }
    }

    // Generate certificate if final quiz and score >= 70%
    let certificate = null;
    if (isFinalQuiz && score >= 70) {
      const certificateId = `CERT-${Date.now()}-${session.user.id.slice(0, 8).toUpperCase()}`;
      
      certificate = await prisma.certificate.create({
        data: {
          userId: session.user.id,
          courseId: courseId,
          certificateId: certificateId,
          score: score,
        },
      });
    }

    return NextResponse.json({
      success: true,
      quizAttemptId: quizAttempt.id,
      score,
      correctAnswers,
      totalQuestions,
      passed: score >= 70,
      results: questionResults,
      certificate: certificate ? {
        id: certificate.certificateId,
        score: certificate.score,
        issuedAt: certificate.issuedAt,
      } : null,
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}
