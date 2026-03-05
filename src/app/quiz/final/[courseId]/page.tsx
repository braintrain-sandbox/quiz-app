'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import {
  startQuiz,
  answerQuestion,
  markForReview,
  setCurrentQuestion,
  submitQuiz,
  resetQuiz,
} from '@/store/slices/quizSlice';
import { RootState } from '@/store/store';
import { Question } from '@/types';

interface FinalQuizResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTaken: number;
  passed: boolean;
  certificateId?: string;
  answers: Record<number, string>;
  questions: Question[];
}

export default function FinalQuizPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session, status } = useSession();

  const { currentQuiz } = useSelector(
    (state: RootState) => state.quiz
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<FinalQuizResult | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchFinalQuiz();
    }
  }, [status, courseId]);

  useEffect(() => {
    // Timer
    if (currentQuiz && !showResults && !submitting) {
      const interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentQuiz, showResults, submitting]);

  const fetchFinalQuiz = async () => {
    try {
      const response = await fetch(`/api/quiz/final/${courseId}`);
      
      if (response.status === 403) {
        alert('Please complete all topics before taking the final quiz!');
        router.push(`/courses`);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch final quiz');
      }

      const data = await response.json();
      setCourseName(data.courseName);
      dispatch(startQuiz(data.questions));
    } catch (error) {
      console.error('Error fetching final quiz:', error);
      alert('Failed to load final quiz');
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, optionKey: string) => {
    if (currentQuiz) {
      dispatch(answerQuestion({ questionId, answer: optionKey }));
    }
  };

  const handleMarkReview = () => {
    if (currentQuiz) {
      dispatch(markForReview(currentQuiz.currentQuestionIndex));
    }
  };

  const handleNext = () => {
    if (currentQuiz && currentQuiz.currentQuestionIndex < currentQuiz.questions.length - 1) {
      dispatch(setCurrentQuestion(currentQuiz.currentQuestionIndex + 1));
    }
  };

  const handlePrevious = () => {
    if (currentQuiz && currentQuiz.currentQuestionIndex > 0) {
      dispatch(setCurrentQuestion(currentQuiz.currentQuestionIndex - 1));
    }
  };

  const handleSubmit = async () => {
    if (!currentQuiz) return;

    const unansweredCount = currentQuiz.questions.length - Object.keys(currentQuiz.answers).length;
    
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          topicId: null, // Final quiz
          answers: currentQuiz.answers,
          timeTaken: timeElapsed,
          isFinalQuiz: true,
          questionIds: currentQuiz.questions.map((q) => q.id),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const result = await response.json();
      
      const finalResult: FinalQuizResult = {
        score: result.score,
        totalQuestions: currentQuiz.questions.length,
        correctAnswers: result.correctAnswers,
        timeTaken: timeElapsed,
        passed: result.passed,
        certificateId: result.certificateId,
        answers: currentQuiz.answers,
        questions: result.questions || currentQuiz.questions,
      };

      setResults(finalResult);
      setShowResults(true);
      dispatch(submitQuiz(finalResult));
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    dispatch(resetQuiz());
    setShowResults(false);
    setResults(null);
    setTimeElapsed(0);
    fetchFinalQuiz();
  };

  const handleBackToCourse = () => {
    dispatch(resetQuiz());
    router.push('/dashboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading final quiz...</div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Final Quiz Results</h1>
            <div className="text-xl text-gray-600">{courseName}</div>
          </div>

          {/* Score Card */}
          <div className={`quiz-card mb-8 ${results.passed ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-500'}`}>
            <div className="text-center">
              <div className="text-6xl font-bold mb-4" style={{ color: results.passed ? '#10b981' : '#f59e0b' }}>
                {results.score.toFixed(1)}%
              </div>
              <div className="text-2xl font-semibold mb-4">
                {results.passed ? '🎉 Congratulations! You Passed!' : '📚 Keep Learning!'}
              </div>
              <div className="flex justify-center gap-8 text-lg mb-4">
                <div>
                  <span className="font-semibold">Correct:</span> {results.correctAnswers}/{results.totalQuestions}
                </div>
                <div>
                  <span className="font-semibold">Time:</span> {formatTime(results.timeTaken)}
                </div>
              </div>

              {results.passed && results.certificateId && (
                <div className="mt-6 p-6 bg-white rounded-lg border-2 border-green-500">
                  <div className="text-2xl mb-3">🏆</div>
                  <div className="text-xl font-semibold text-green-700 mb-2">Certificate Earned!</div>
                  <div className="text-sm text-gray-600 mb-3">Certificate ID: {results.certificateId}</div>
                  <p className="text-sm text-gray-700">
                    Your certificate has been generated and saved to your account. View it in your dashboard.
                  </p>
                </div>
              )}

              {!results.passed && (
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="text-gray-700">
                    You need at least 70% to pass and earn a certificate. Review your answers and try again!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Results */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Detailed Results</h2>
            <div className="space-y-4">
              {results.questions.map((question, index) => {
                const userAnswer = results.answers[index];
                const isCorrect = userAnswer === question.correctAnswer;

                return (
                  <div
                    key={question.id}
                    className={`quiz-card ${isCorrect ? 'border-l-4 border-green-500 bg-green-50' : 'border-l-4 border-red-500 bg-red-50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{isCorrect ? '✅' : '❌'}</div>
                      <div className="flex-1">
                        <div className="font-semibold mb-2">
                          Question {index + 1}: {question.question}
                        </div>

                        <div className="grid md:grid-cols-2 gap-2 mb-3">
                          {(['A', 'B', 'C', 'D'] as const).map((key) => {
                            const optionKey = `option${key}` as keyof Question;
                            const isUserAnswer = userAnswer === key;
                            const isCorrectAnswer = question.correctAnswer === key;

                            return (
                              <div
                                key={key}
                                className={`p-2 rounded text-sm ${
                                  isCorrectAnswer
                                    ? 'bg-green-200 font-semibold'
                                    : isUserAnswer
                                    ? 'bg-red-200'
                                    : 'bg-white'
                                }`}
                              >
                                {key}. {question[optionKey]}
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-sm">
                          <div className="mb-1">
                            <span className="font-semibold">Your Answer:</span>{' '}
                            {userAnswer || 'Not answered'}
                          </div>
                          <div className="mb-2">
                            <span className="font-semibold">Correct Answer:</span>{' '}
                            {question.correctAnswer}
                          </div>
                          <div className="text-gray-700 bg-white p-3 rounded">
                            <span className="font-semibold">Explanation:</span> {question.explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button onClick={handleBackToCourse} className="btn-primary">
              Back to Dashboard
            </button>
            {!results.passed && (
              <button onClick={handleRetake} className="btn-primary bg-yellow-600 hover:bg-yellow-700">
                Retake Final Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">No quiz data available</div>
      </div>
    );
  }

  const currentQuestion = currentQuiz.questions[currentQuiz.currentQuestionIndex];
  const progress = ((currentQuiz.currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;
  const answeredCount = Object.keys(currentQuiz.answers).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold">Final Syllabus Quiz</h1>
              <p className="text-gray-600">{courseName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-gray-600">Time Elapsed</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>
                Question {currentQuiz.currentQuestionIndex + 1} of {currentQuiz.questions.length}
              </span>
              <span>
                Answered: {answeredCount}/{currentQuiz.questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="progress-bar h-3" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-2">
            <div className="quiz-card">
              {/* Question */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    {currentQuestion.difficulty}
                  </span>
                  {currentQuiz.markedForReview.includes(currentQuiz.currentQuestionIndex) && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                      ⭐ Marked
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold">{currentQuestion.question}</h2>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const optionKey = `option${key}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
                  const isSelected = currentQuiz.answers[currentQuestion.id] === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleAnswer(currentQuestion.id, key)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300 bg-white'
                      }`}
                    >
                      <span className="font-semibold mr-3">{key}.</span>
                      {currentQuestion[optionKey]}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={handleMarkReview}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    currentQuiz.markedForReview.includes(currentQuiz.currentQuestionIndex)
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-300 hover:border-yellow-400'
                  }`}
                >
                  {currentQuiz.markedForReview.includes(currentQuiz.currentQuestionIndex) ? '⭐ Marked' : '⭐ Mark for Review'}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuiz.currentQuestionIndex === 0}
                    className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {currentQuiz.currentQuestionIndex === currentQuiz.questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <div className="quiz-card sticky top-4">
              <h3 className="font-semibold mb-3">Question Navigator</h3>
              <div className="grid grid-cols-5 gap-2">
                {currentQuiz.questions.map((q, index) => {
                  const isAnswered = currentQuiz.answers[q.id] !== undefined;
                  const isMarked = currentQuiz.markedForReview.includes(index);
                  const isCurrent = index === currentQuiz.currentQuestionIndex;

                  return (
                    <button
                      key={index}
                      onClick={() => dispatch(setCurrentQuestion(index))}
                      className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                        isCurrent
                          ? 'bg-primary-600 text-white'
                          : isAnswered
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      } ${isMarked ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary-600 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-yellow-400 rounded"></div>
                  <span>Marked</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Final Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
