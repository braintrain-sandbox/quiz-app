'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import RazorpayCheckoutButton from '@/components/RazorpayCheckoutButton';

interface Topic {
  id: string;
  title: string;
  slug: string;
  description: string;
  order: number;
  isCompleted?: boolean;
  isUnlocked?: boolean;
  bestScore?: number;
  attemptsCount?: number;
  _count?: { questions: number };
}

interface CourseDetails {
  id: string;
  title: string;
  slug?: string;
  description: string;
  topics: Topic[];
  hasPaidAccess?: boolean;
  allTopicsCompleted?: boolean;
  canTakeFinalQuiz?: boolean;
}

interface CurriculumWeek {
  week: string;
  title: string;
  coreObjectives: string[];
  practicalImplementation: string[];
  weeklyDeliverable: string;
  evaluationCheckpoint: string;
  mentorValidation: string[];
}

interface CourseCurriculum {
  programTitle: string;
  duration: string;
  mode: string;
  weeks: CurriculumWeek[];
}

interface CourseData {
  courseId: string;
  slug: string;
  title: string;
  duration: string;
  mode: string;
  programOverview: Record<string, any>;
  curriculum: CurriculumWeek[];
  capstone: Record<string, any>;
  industryExposure: Record<string, any>;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.courseSlug) {
      fetchCourseDetails();
    }
  }, [params.courseSlug, session]);

  const fetchCourseDetails = async () => {
    try {
      // First get all courses to find the ID from slug
      const coursesRes = await fetch('/api/courses');
      const courses = await coursesRes.json();
      const matchedCourse = courses.find((c: any) => c.slug === params.courseSlug);

      if (matchedCourse) {
        // Now fetch detailed progress
        const response = await fetch(`/api/courses/${matchedCourse.id}`);
        const data = await response.json();
        setCourse(data);

        const curriculumResponse = await fetch(`/api/curriculum/${matchedCourse.slug}`);
        if (curriculumResponse.ok) {
          const data: CourseData = await curriculumResponse.json();
          setCourseData(data);
        } else {
          setCourseData(null);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (topicId: string, isUnlocked: boolean) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!course?.hasPaidAccess) {
      alert('Please complete payment to unlock this course.');
      return;
    }

    if (!isUnlocked) {
      alert('Please complete the previous topic first');
      return;
    }

    router.push(`/quiz/${topicId}`);
  };

  const handleStartFinalQuiz = () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!course?.hasPaidAccess) {
      alert('Please complete payment to unlock the final quiz.');
      return;
    }

    router.push(`/quiz/final/${course?.id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Course not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Course Header */}
      <div className="mb-8">
        <Link href="/courses" className="text-primary-600 hover:underline mb-4 inline-block">
          ← Back to Courses
        </Link>
        <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
        <p className="text-lg text-gray-600">{course.description}</p>
      </div>

      {!session && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <p className="text-yellow-800">
            🔔 Please <Link href="/auth/signin" className="underline font-semibold">sign in</Link> to start quizzes and track your progress
          </p>
        </div>
      )}

      {session && !course.hasPaidAccess && (
        <div className="quiz-card border border-emerald-200 bg-emerald-50 mb-8">
          <h2 className="text-xl font-semibold text-emerald-800 mb-2">Unlock Full Course Access</h2>
          <p className="text-emerald-700 mb-4">Complete payment to unlock all topic quizzes and the final syllabus quiz for this course.</p>
          <RazorpayCheckoutButton
            courseId={course.id}
            courseTitle={course.title}
            userName={session.user?.name}
            userEmail={session.user?.email}
            onPaymentSuccess={fetchCourseDetails}
          />
        </div>
      )}

      {session && course.hasPaidAccess && (
        <div className="quiz-card border border-green-200 bg-green-50 mb-8">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Confirmed</h2>
          <p className="text-green-700">Your access for this course is active.</p>
        </div>
      )}

      {courseData && (
        <div className="quiz-card mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Self-Learning Curriculum</h2>
            <p className="text-gray-600 mt-1">
              {courseData.duration} | {courseData.mode}
            </p>
          </div>

          <div className="space-y-4">
            {courseData.curriculum.map((week) => (
              <div key={week.week} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-primary-600">Week {week.week}</p>
                  <h3 className="text-lg font-semibold">{week.title}</h3>
                </div>

                {week.coreObjectives && Array.isArray(week.coreObjectives) && (
                  <ul className="mb-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {week.coreObjectives.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                )}

                {week.practicalImplementation && Array.isArray(week.practicalImplementation) && week.practicalImplementation.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold">Practical Implementation:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {week.practicalImplementation.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {week.weeklyDeliverable && (
                  <p className="text-sm">
                    <span className="font-semibold">Deliverable:</span> {week.weeklyDeliverable}
                  </p>
                )}

                {week.evaluationCheckpoint && (
                  <p className="text-sm mt-2">
                    <span className="font-semibold">Evaluation Checkpoint:</span> {week.evaluationCheckpoint}
                  </p>
                )}

                {week.mentorValidation && Array.isArray(week.mentorValidation) && week.mentorValidation.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">Mentor Validation:</p>
                    <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {week.mentorValidation.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {courseData?.programOverview && (
        <div className="quiz-card mb-8">
          <h2 className="text-2xl font-semibold mb-3">Program Overview</h2>
          <div className="text-sm text-gray-700 space-y-3">
            {courseData.programOverview.objective && (
              <div>
                <p className="font-semibold">Objective:</p>
                <p>{courseData.programOverview.objective}</p>
              </div>
            )}
            {courseData.programOverview.keyOutcomes && Array.isArray(courseData.programOverview.keyOutcomes) && (
              <div>
                <p className="font-semibold">Key Outcomes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {courseData.programOverview.keyOutcomes.map((outcome: string) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {courseData?.capstone && (
        <div className="quiz-card mb-8">
          <h2 className="text-2xl font-semibold mb-3">Capstone Project</h2>
          <div className="text-sm text-gray-700 space-y-3">
            {courseData.capstone.objective && (
              <div>
                <p className="font-semibold">Objective:</p>
                <p>{courseData.capstone.objective}</p>
              </div>
            )}
            {courseData.capstone.requirements && Array.isArray(courseData.capstone.requirements) && (
              <div>
                <p className="font-semibold">Requirements:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {courseData.capstone.requirements.map((req: string) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {courseData?.industryExposure && (
        <div className="quiz-card mb-8">
          <h2 className="text-2xl font-semibold mb-3">Industry Exposure</h2>
          <div className="text-sm text-gray-700 space-y-3">
            {courseData.industryExposure.industries && Array.isArray(courseData.industryExposure.industries) && (
              <div>
                <p className="font-semibold">Industries:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {courseData.industryExposure.industries.map((industry: string) => (
                    <li key={industry}>{industry}</li>
                  ))}
                </ul>
              </div>
            )}
            {courseData.industryExposure.datasetRequirements && Array.isArray(courseData.industryExposure.datasetRequirements) && (
              <div>
                <p className="font-semibold">Dataset Requirements:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {courseData.industryExposure.datasetRequirements.map((req: string) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topics List */}
      <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Course Topics</h2>
        {course.topics.map((topic, index) => {
          const isLocked = session ? !topic.isUnlocked || !course.hasPaidAccess : true;
          
          return (
            <div
              key={topic.id}
              className={`quiz-card ${isLocked && session ? 'locked-card' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-gray-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-semibold">{topic.title}</h3>
                    {topic.isCompleted && (
                      <span className="text-green-600 text-xl">✓</span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">{topic.description}</p>
                  
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>📝 {topic._count?.questions || 0} Questions</span>
                    {topic.bestScore !== undefined && topic.bestScore > 0 && (
                      <span className="text-primary-600 font-semibold">
                        Best Score: {topic.bestScore.toFixed(1)}%
                      </span>
                    )}
                    {topic.attemptsCount !== undefined && topic.attemptsCount > 0 && (
                      <span>Attempts: {topic.attemptsCount}</span>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {session ? (
                    isLocked ? (
                      <div className="text-gray-400 text-sm">
                        🔒 Locked
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuiz(topic.id, topic.isUnlocked || false)}
                        className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition-colors"
                      >
                        {topic.isCompleted ? 'Retake Quiz' : 'Start Quiz'}
                      </button>
                    )
                  ) : (
                    <Link
                      href="/auth/signin"
                      className="bg-gray-300 text-gray-600 px-6 py-2 rounded"
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Quiz Section */}
      {session && (
        <div className="quiz-card bg-gradient-to-r from-primary-50 to-primary-100 border-2 border-primary-600">
          <h2 className="text-2xl font-semibold mb-3">🏆 Final Syllabus Quiz</h2>
          <p className="text-gray-700 mb-4">
            Complete all topics above to unlock the comprehensive final quiz covering all course material.
            Score 70% or higher to earn your certificate!
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Status: {course.allTopicsCompleted 
                  ? '✅ All topics completed - Ready!' 
                  : `⏳ Complete ${course.topics.filter(t => !t.isCompleted).length} more topic(s)`
                }
              </p>
            </div>
            <button
              onClick={handleStartFinalQuiz}
              disabled={!course.canTakeFinalQuiz}
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
                course.canTakeFinalQuiz
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {course.canTakeFinalQuiz ? 'Take Final Quiz' : '🔒 Locked'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
