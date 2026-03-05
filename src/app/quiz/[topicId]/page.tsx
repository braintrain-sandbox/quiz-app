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
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchQuizQuestions();
  }, [params.topicId, session]);

  // Keyboard navigation for results
  useEffect(() => {
    if (!showResults || !results) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentResultIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentResultIndex(prev => Math.min(results.results.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showResults, results]);

  useEffect(() => {
    // Timer - stops when submitting or showing results
    if (!submitting && !showResults) {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [submitting, showResults]);

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
          questionIds: currentQuiz.questions.map((q) => q.id),
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
    const currentResult = results.results[currentResultIndex];
    const totalResults = results.results.length;

    const getOptionClass = (optionKey: string) => {
      const isUserAnswer = currentResult.userAnswer === optionKey;
      const isCorrectAnswer = currentResult.correctAnswer === optionKey;
      
      if (isCorrectAnswer && isUserAnswer) {
        return 'bg-green-100 border-2 border-green-500 font-semibold';
      }
      if (isCorrectAnswer) {
        return 'bg-green-100 border-2 border-green-400 font-semibold';
      }
      if (isUserAnswer) {
        return 'bg-red-100 border-2 border-red-500 font-semibold';
      }
      return 'bg-gray-50 border border-gray-200';
    };

    const getOptionIcon = (optionKey: string) => {
      const isUserAnswer = currentResult.userAnswer === optionKey;
      const isCorrectAnswer = currentResult.correctAnswer === optionKey;
      
      if (isCorrectAnswer) {
        return '✓';
      }
      if (isUserAnswer && !isCorrectAnswer) {
        return '✗';
      }
      return '';
    };

    return (
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header Stats */}
        <div className="quiz-card mb-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            {results.passed ? '🎉 Congratulations!' : '📊 Quiz Complete'}
          </h1>

          <div className="grid grid-cols-3 gap-4 mb-6">
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-center font-semibold">
                ✅ You passed! The next topic is now unlocked.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-center">
                You can retake this quiz to improve your score.
              </p>
            </div>
          )}
        </div>

        {/* Results Review Section */}
        <div className="flex gap-6">
          {/* Question Navigator Grid */}
          <div className="quiz-card w-64 flex-shrink-0">
            <h3 className="font-semibold mb-3 text-sm">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {results.results.map((result: any, index: number) => (
                <button
                  key={result.questionId}
                  onClick={() => setCurrentResultIndex(index)}
                  className={`
                    w-10 h-10 rounded flex items-center justify-center text-sm font-semibold
                    transition-all border-2
                    ${currentResultIndex === index 
                      ? 'ring-2 ring-blue-400 ring-offset-2' 
                      : ''
                    }
                    ${result.isCorrect
                      ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                      : result.userAnswer
                      ? 'bg-red-100 border-red-500 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 border-gray-400 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  title={result.isCorrect ? 'Correct' : result.userAnswer ? 'Incorrect' : 'Not answered'}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                <span>Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                <span>Incorrect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
                <span>Skipped</span>
              </div>
            </div>
          </div>

          {/* Current Question Display */}
          <div className="flex-1">
            <div className={`p-5 rounded-lg border-l-4 shadow-sm mb-4 ${
              currentResult.isCorrect
                ? 'bg-white border-green-500'
                : 'bg-white border-red-500'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl flex-shrink-0">
                  {currentResult.isCorrect ? '✅' : '❌'}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-lg">
                      Question {currentResultIndex + 1} of {totalResults}
                    </p>
                    {currentResult.difficulty && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        currentResult.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                        currentResult.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {currentResult.difficulty}
                      </span>
                    )}
                  </div>

                  <p className="text-lg mb-4">{currentResult.question}</p>
                  
                  {/* Answer Options */}
                  <div className="grid gap-2 mb-4">
                    {['A', 'B', 'C', 'D'].map((optionKey) => {
                      const optionText = currentResult[`option${optionKey}`];
                      const icon = getOptionIcon(optionKey);
                      
                      return (
                        <div
                          key={optionKey}
                          className={`p-3 rounded-lg transition-all ${getOptionClass(optionKey)}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-semibold flex-shrink-0">{optionKey}.</span>
                            <span className="flex-1">{optionText}</span>
                            {icon && (
                              <span className="flex-shrink-0 text-lg font-bold">
                                {icon}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Answer Summary */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-semibold">Your Answer:</span>{' '}
                        <span className={currentResult.isCorrect ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {currentResult.userAnswer || 'Not answered'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Correct Answer:</span>{' '}
                        <span className="text-green-700 font-semibold">{currentResult.correctAnswer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm">
                      <span className="font-semibold text-blue-900">💡 Explanation:</span>
                      <span className="text-gray-700 ml-1">{currentResult.explanation}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentResultIndex(prev => Math.max(0, prev - 1))}
                disabled={currentResultIndex === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <div className="text-center">
                <span className="text-sm text-gray-600 block">
                  Question {currentResultIndex + 1} of {totalResults}
                </span>
                <span className="text-xs text-gray-400">
                  Use ← → arrow keys to navigate
                </span>
              </div>

              <button
                onClick={() => setCurrentResultIndex(prev => Math.min(totalResults - 1, prev + 1))}
                disabled={currentResultIndex === totalResults - 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => router.back()}
                className="btn-primary"
              >
                Back to Course
              </button>
              <button
                onClick={() => {
                  setShowResults(false);
                  setCurrentResultIndex(0);
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
            const optionKey = `option${option}` as 'optionA' | 'optionB' | 'optionC' | 'optionD';
            const optionText = currentQuestion[optionKey] as string;
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
