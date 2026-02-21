// Type definitions for the application

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl?: string;
  order: number;
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  courseId: string;
  isCompleted?: boolean;
  isUnlocked?: boolean;
  bestScore?: number;
  attemptsCount?: number;
  _count?: {
    questions: number;
  };
}

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  topicId: string;
  courseId: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  topicId?: string;
  isFinalQuiz: boolean;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  answers: Record<string, string>;
  createdAt: Date;
}

export interface TopicProgress {
  id: string;
  userId: string;
  topicId: string;
  courseId: string;
  isCompleted: boolean;
  completedAt?: Date;
  bestScore: number;
  attemptsCount: number;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateId: string;
  score: number;
  issuedAt: Date;
}

export interface QuizResult {
  success: boolean;
  quizAttemptId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  results: {
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  certificate?: {
    id: string;
    score: number;
    issuedAt: Date;
  };
}
