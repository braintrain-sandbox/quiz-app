'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  startQuiz,
  answerQuestion,
  markForReview,
  setCurrentQuestion,
  submitQuiz,
} from '@/store/slices/quizSlice';
import { Question } from '@/types';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { currentQuiz, quizResult } = useSelector((state: RootState) => state.quiz);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchQuizQuestions();

    // Timer
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [params.topicId, session]);

  const fetchQuizQuestions = async () => {
    try {
      const response = await fetch(`/api/quiz/topic/${params.topicId}`);
      const data = await response.json();

      if (response.ok) {
        dispatch(startQuiz({
          topicId: data.topicId,
          courseId: data.courseId,
          isFinalQuiz: false,
          questions: data.questions,
        }));
      } else {
        alert(data.error || 'Failed to load quiz');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Failed to load quiz');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    dispatch(answerQuestion({ questionId, answer }));
  };

  const handleMarkReview = () => {
    dispatch(markForReview(currentQuiz.currentQuestionIndex));
  };

  const handleNext = () => {
    if (currentQuiz.currentQuestionIndex < currentQuiz.questions.length - 1) {
      dispatch(setCurrentQuestion(currentQuiz.currentQuestionIndex + 1));
    }
  };

  const handlePrevious = () => {
    if (currentQuiz.currentQuestionIndex > 0) {
      dispatch(setCurrentQuestion(currentQuiz.currentQuestionIndex - 1));
    }
  };

  const handleSubmit = async () => {
    const unanswered = currentQuiz.questions.length - Object.keys(currentQuiz.answers).length;
    
    if (unanswered > 0) {
      const confirm = window.confirm(
        `You have ${unanswered} unanswered question(s). Do you want to submit anyway?`
      );
      if (!confirm) return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: currentQuiz.topicId,
          courseId: currentQuiz.courseId,
          answers: currentQuiz.answers,
          timeTaken: timeElapsed,
          isFinalQuiz: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        setShowResults(true);
        dispatch(submitQuiz({
          score: data.score,
          totalQuestions: data.totalQuestions,
          correctAnswers: data.correctAnswers,
          timeTaken: timeElapsed,
        }));
      } else {
        alert(data.error || 'Failed to submit quiz');
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading quiz...</div>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="quiz-card">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {results.passed ? '🎉 Congratulations!' : '📊 Quiz Complete'}
          </h1>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{results.score.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">
                {results.correctAnswers}/{results.totalQuestions}
              </div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded">
              <div className="text-3xl font-bold text-purple-600">{formatTime(timeElapsed)}</div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>

          {results.passed ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-center font-semibold">
                ✅ You passed! The next topic is now unlocked.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-center">
                You can retake this quiz to improve your score.
              </p>
            </div>
          )}

          {/* Detailed Results */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Detailed Results</h2>
            <div className="space-y-4">
              {results.results.map((result: any, index: number) => (
                <div
                  key={result.questionId}
                  className={`p-4 rounded-lg border-2 ${
                    result.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">
                      {result.isCorrect ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold mb-2">Q{index + 1}: {result.question}</p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Your answer:</span>{' '}
                        <span className={result.isCorrect ? 'text-green-700' : 'text-red-700'}>
                          {result.userAnswer || 'Not answered'}
                        </span>
                      </p>
                      {!result.isCorrect && (
                        <p className="text-sm mb-1">
                          <span className="font-semibold">Correct answer:</span>{' '}
                          <span className="text-green-700">{result.correctAnswer}</span>
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mt-2">
                        <span className="font-semibold">Explanation:</span> {result.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.back()}
              className="btn-primary"
            >
              Back to Course
            </button>
            <button
              onClick={() => {
                setShowResults(false);
                fetchQuizQuestions();
                setTimeElapsed(0);
              }}
              className="btn-secondary"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentQuiz.questions[currentQuiz.currentQuestionIndex];
  const answered = Object.keys(currentQuiz.answers).length;
  const total = currentQuiz.questions.length;
  const progress = (answered / total) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Quiz Header */}
      <div className="quiz-card mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm text-gray-600">
              Question {currentQuiz.currentQuestionIndex + 1} of {total}
            </span>
          </div>
          <div className="flex gap-6">
            <div className="text-sm">
              <span className="font-semibold">Answered:</span> {answered}/{total}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Time:</span> {formatTime(timeElapsed)}
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="quiz-card mb-4">
        <div className="flex items-start gap-3 mb-6">
          <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
            {currentQuiz.currentQuestionIndex + 1}
          </div>
          <div className="flex-1">
            <p className="text-xl font-semibold mb-2">{currentQuestion.question}</p>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                currentQuestion.difficulty === 'EASY'
                  ? 'bg-green-100 text-green-700'
                  : currentQuestion.difficulty === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {currentQuestion.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((option) => {
            const optionText = currentQuestion[`option${option}` as keyof Question] as string;
            const isSelected = currentQuiz.answers[currentQuestion.id] === option;

            return (
              <button
                key={option}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {option}
                  </div>
                  <span>{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevious}
          disabled={currentQuiz.currentQuestionIndex === 0}
          className="btn-secondary disabled:opacity-50"
        >
          ← Previous
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleMarkReview}
            className={`px-4 py-2 rounded ${
              currentQuiz.markedForReview.includes(currentQuiz.currentQuestionIndex)
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            {currentQuiz.markedForReview.includes(currentQuiz.currentQuestionIndex)
              ? '★ Marked'
              : '☆ Mark for Review'}
          </button>

          {currentQuiz.currentQuestionIndex === total - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary">
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <div className="quiz-card mt-4">
        <p className="text-sm font-semibold mb-3">Question Navigator</p>
        <div className="grid grid-cols-10 gap-2">
          {currentQuiz.questions.map((q, index) => {
            const isAnswered = currentQuiz.answers[q.id];
            const isCurrent = index === currentQuiz.currentQuestionIndex;
            const isMarked = currentQuiz.markedForReview.includes(index);

            return (
              <button
                key={q.id}
                onClick={() => dispatch(setCurrentQuestion(index))}
                className={`w-10 h-10 rounded text-sm font-semibold ${
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : isAnswered
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200'
                } ${isMarked ? 'ring-2 ring-yellow-500' : ''}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span>Not Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200 rounded ring-2 ring-yellow-500"></div>
            <span>Marked for Review</span>
          </div>
        </div>
      </div>
    </div>
  );
}
