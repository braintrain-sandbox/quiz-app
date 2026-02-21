import { PrismaClient } from '@prisma/client';
import { coursesData } from './data/courses';
import marketingQuestions from './data/questions-marketing';
import dataAnalystQuestions from './data/questions-data-analyst';
import productStrategistQuestions from './data/questions-product-strategist';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.certificate.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.topicProgress.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.course.deleteMany();

  console.log('✅ Existing data cleared');

  // Seed Courses and Topics
  console.log('📚 Seeding courses and topics...');
  
  for (const courseData of coursesData) {
    const course = await prisma.course.create({
      data: {
        id: courseData.id,
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        imageUrl: courseData.imageUrl || '',
        order: courseData.order,
        isActive: true,
        topics: {
          create: courseData.topics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            slug: topic.slug,
            description: topic.description,
            order: topic.order,
            isActive: true,
          })),
        },
      },
    });
    console.log(`  ✓ Created course: ${course.title} with ${courseData.topics.length} topics`);
  }

  // Seed Questions
  console.log('📝 Seeding questions...');
  
  const allQuestions = [
    ...marketingQuestions,
    ...dataAnalystQuestions,
    ...productStrategistQuestions,
  ];

  let questionCount = 0;
  for (const question of allQuestions) {
    await prisma.question.create({
      data: {
        question: question.question,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        tags: question.tags,
        topicId: question.topicId,
        courseId: question.courseId,
        isActive: true,
      },
    });
    questionCount++;
    
    if (questionCount % 50 === 0) {
      console.log(`  ✓ Seeded ${questionCount} questions...`);
    }
  }

  console.log(`  ✓ Total questions seeded: ${questionCount}`);

  // Summary
  const courses = await prisma.course.count();
  const topics = await prisma.topic.count();
  const questions = await prisma.question.count();

  console.log('\n📊 Seed Summary:');
  console.log(`  • Courses: ${courses}`);
  console.log(`  • Topics: ${topics}`);
  console.log(`  • Questions: ${questions}`);
  console.log('\n✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
