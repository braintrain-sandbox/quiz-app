import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Master AI Skills with Interactive Quizzes
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Learn AI Marketing, Data Analysis, and Product Strategy through comprehensive
          topic-wise quizzes. Unlock topics progressively and earn certificates.
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/courses" className="btn-primary text-lg px-8 py-3">
            Explore Courses
          </Link>
          <Link href="/auth/signup" className="btn-secondary text-lg px-8 py-3">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="quiz-card text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">3 Comprehensive Courses</h3>
          <p className="text-gray-600">
            AI Marketing Intelligence, AI Data Analyst, and AI Product & Automation Strategist
          </p>
        </div>

        <div className="quiz-card text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Progressive Learning</h3>
          <p className="text-gray-600">
            Unlock topics step-by-step by completing previous topics with 100% completion
          </p>
        </div>

        <div className="quiz-card text-center">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold mb-2">Earn Certificates</h3>
          <p className="text-gray-600">
            Complete all topics and pass the final quiz with 70%+ to earn your certificate
          </p>
        </div>
      </section>

      {/* Course Overview */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Available Courses</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="quiz-card">
            <h3 className="text-2xl font-semibold mb-3 text-primary-600">
              AI Marketing Intelligence
            </h3>
            <p className="text-gray-600 mb-4">
              Master AI-powered marketing strategies, predictive analytics, customer
              segmentation, and marketing automation.
            </p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>• 8 Topics</li>
              <li>• 400+ MCQ Questions</li>
              <li>• Final Syllabus Quiz</li>
            </ul>
            <Link href="/courses/ai-marketing-intelligence" className="text-primary-600 hover:underline">
              View Course →
            </Link>
          </div>

          <div className="quiz-card">
            <h3 className="text-2xl font-semibold mb-3 text-primary-600">
              AI Data Analyst
            </h3>
            <p className="text-gray-600 mb-4">
              Become proficient in Python, SQL, statistics, machine learning, and business
              intelligence tools.
            </p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>• 8 Topics</li>
              <li>• 400+ MCQ Questions</li>
              <li>• Final Syllabus Quiz</li>
            </ul>
            <Link href="/courses/ai-data-analyst" className="text-primary-600 hover:underline">
              View Course →
            </Link>
          </div>

          <div className="quiz-card">
            <h3 className="text-2xl font-semibold mb-3 text-primary-600">
              AI Product & Automation Strategist
            </h3>
            <p className="text-gray-600 mb-4">
              Learn AI product lifecycle, automation workflows, prompt engineering, and system
              design.
            </p>
            <ul className="text-sm text-gray-700 space-y-1 mb-4">
              <li>• 8 Topics</li>
              <li>• 400+ MCQ Questions</li>
              <li>• Final Syllabus Quiz</li>
            </ul>
            <Link href="/courses/ai-product-automation-strategist" className="text-primary-600 hover:underline">
              View Course →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white rounded-lg p-8 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              1
            </div>
            <h4 className="font-semibold mb-2">Choose Course</h4>
            <p className="text-sm text-gray-600">Select from 3 AI career paths</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              2
            </div>
            <h4 className="font-semibold mb-2">Complete Topics</h4>
            <p className="text-sm text-gray-600">Take quizzes topic by topic, unlock progressively</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              3
            </div>
            <h4 className="font-semibold mb-2">Final Quiz</h4>
            <p className="text-sm text-gray-600">Take comprehensive final quiz after all topics</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
              4
            </div>
            <h4 className="font-semibold mb-2">Get Certificate</h4>
            <p className="text-sm text-gray-600">Score 70%+ to earn your certificate</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center bg-primary-600 text-white rounded-lg p-12">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Your AI Career?</h2>
        <p className="text-xl mb-6">Join thousands learning AI skills through our quiz platform</p>
        <Link href="/auth/signup" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block">
          Sign Up Now - It's Free
        </Link>
      </section>
    </div>
  );
}
