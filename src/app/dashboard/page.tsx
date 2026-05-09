'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  slug: string;
  totalTopics: number;
  completedTopics: number;
  progress: number;
  averageScore: number;
  finalQuizTaken: boolean;
  finalQuizScore: number;
  hasCertificate: boolean;
  certificateId?: string;
}

interface ProgressData {
  courses: CourseProgress[];
  totalQuizzesTaken: number;
  totalCertificates: number;
}

const EMPTY_PROGRESS: ProgressData = {
  courses: [] as CourseProgress[],
  totalQuizzesTaken: 0,
  totalCertificates: 0,
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchProgress();
    }
  }, [status]);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/progress');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }

        console.error('Failed to load progress:', response.status);
        setProgress(EMPTY_PROGRESS);
        return;
      }

      const data = await response.json();
      setProgress({
        courses: Array.isArray(data?.courses) ? data.courses : [],
        totalQuizzesTaken: Number(data?.totalQuizzesTaken ?? 0),
        totalCertificates: Number(data?.totalCertificates ?? 0),
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
      setProgress(EMPTY_PROGRESS);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">No progress data yet</div>
      </div>
    );
  }

  const courses = progress.courses ?? [];
  const totalProgress =
    courses.length > 0 ? courses.reduce((sum, c) => sum + c.progress, 0) / courses.length : 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">My Dashboard</h1>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="quiz-card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-3xl font-bold text-blue-600 mb-2">{totalProgress.toFixed(0)}%</div>
          <div className="text-sm text-gray-700">Overall Progress</div>
        </div>

        <div className="quiz-card bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {courses.reduce((sum, c) => sum + c.completedTopics, 0)}
          </div>
          <div className="text-sm text-gray-700">Topics Completed</div>
        </div>

        <div className="quiz-card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {progress.totalQuizzesTaken}
          </div>
          <div className="text-sm text-gray-700">Quizzes Taken</div>
        </div>

        <div className="quiz-card bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {progress.totalCertificates}
          </div>
          <div className="text-sm text-gray-700">Certificates Earned</div>
        </div>
      </div>

      {/* Course Progress */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Course Progress</h2>
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.courseId} className="quiz-card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{course.courseTitle}</h3>
                  <div className="flex gap-4 text-sm text-gray-600 mb-3">
                    <span>
                      📚 {course.completedTopics}/{course.totalTopics} topics
                    </span>
                    {course.averageScore > 0 && (
                      <span>📊 Avg Score: {course.averageScore}%</span>
                    )}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="progress-bar h-3"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">{course.progress.toFixed(0)}% Complete</div>
                </div>

                <div className="ml-6 text-right">
                  {course.hasCertificate ? (
                    <div className="mb-2">
                      <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded text-sm font-semibold">
                        ✓ Certified
                      </span>
                    </div>
                  ) : course.finalQuizTaken ? (
                    <div className="mb-2">
                      <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded text-sm">
                        Score: {course.finalQuizScore.toFixed(1)}%
                      </span>
                    </div>
                  ) : null}
                  
                  <Link
                    href={`/courses/${course.slug}`}
                    className="btn-primary text-sm"
                  >
                    {course.progress === 100 ? 'View Course' : 'Continue Learning'}
                  </Link>
                </div>
              </div>

              {/* Final Quiz Status */}
              {course.progress === 100 && !course.hasCertificate && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold">🏆 Final Quiz</p>
                      <p className="text-xs text-gray-600">
                        {course.finalQuizTaken
                          ? `Last score: ${course.finalQuizScore.toFixed(1)}% - ${
                              course.finalQuizScore >= 70 ? 'Passed!' : 'Need 70% to pass'
                            }`
                          : 'Take the final quiz to earn your certificate'}
                      </p>
                    </div>
                    <Link
                      href={`/quiz/final/${course.courseId}`}
                      className="text-sm btn-primary"
                    >
                      {course.finalQuizTaken ? 'Retake Final Quiz' : 'Take Final Quiz'}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Certificates */}
      {progress.totalCertificates > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">My Certificates</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {courses
              .filter((c) => c.hasCertificate)
              .map((course) => (
                <div
                  key={course.courseId}
                  className="quiz-card bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-600"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3">🏆</div>
                    <h3 className="font-semibold mb-2">{course.courseTitle}</h3>
                    <div className="text-sm text-gray-700 mb-2">
                      Certificate ID: {course.certificateId}
                    </div>
                    <div className="text-sm text-primary-700 font-semibold">
                      Score: {course.finalQuizScore.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Motivational Message */}
      {totalProgress < 100 && (
        <div className="mt-8 quiz-card bg-gradient-to-r from-primary-600 to-purple-600 text-white">
          <h3 className="text-xl font-semibold mb-2">Keep Going! 💪</h3>
          <p className="text-primary-100">
            You&apos;re {totalProgress.toFixed(0)}% through your AI career journey. Complete more topics
            to unlock final quizzes and earn certificates!
          </p>
        </div>
      )}
    </div>
  );
}
