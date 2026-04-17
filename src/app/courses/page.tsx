'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import  { useSession } from 'next-auth/react';
import { Course } from '@/types';

export default function CoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [session]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');

      if (!response.ok) {
        console.error('Failed to fetch courses:', response.status);
        setCourses([]);
        return;
      }

      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">AI Career Courses</h1>
      
      {!session && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-yellow-800">
            🔔 Sign in to track your progress and earn certificates
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => {
          const completedTopics = session
            ? course.topics?.filter((t: any) => t.isCompleted).length || 0
            : 0;
          const totalTopics = course.topics?.length || 0;
          const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

          return (
            <div key={course.id} className="quiz-card">
              <h2 className="text-2xl font-semibold mb-3 text-primary-600">
                {course.title}
              </h2>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {course.description}
              </p>

              {session && totalTopics > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{completedTopics}/{totalTopics} topics</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="progress-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {totalTopics} Topics
                </div>
                <Link
                  href={`/courses/${course.slug}`}
                  className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors"
                >
                  {session ? 'Continue' : 'View Course'}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
