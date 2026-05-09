import { Difficulty, PrismaClient } from '@prisma/client';
import { coursesData } from './data/courses';
import marketingQuestions from './data/questions-marketing';
import dataAnalystQuestions from './data/questions-data-analyst';
import productStrategistQuestions from './data/questions-product-strategist';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function toDifficulty(value: string): Difficulty {
  if (value === 'EASY' || value === 'MEDIUM' || value === 'HARD') {
    return value;
  }

  return 'MEDIUM';
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.certificate.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.curriculumWeek.deleteMany();
  await prisma.topicProgress.deleteMany();
  await prisma.question.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.course.deleteMany();

  console.log('✅ Existing data cleared');

  // Load curriculum JSON files
  const courseJsonMap: { [key: string]: any } = {
    'course-1': 'ai-marketing-intelligence.json',
    'course-2': 'ai-data-analyst.json',
    'course-3': 'ai-product-automation-strategist.json',
  };

  // Seed Courses and Topics with Curriculum Metadata
  console.log('📚 Seeding courses and topics with curriculum data...');
  
  for (const courseData of coursesData) {
    // Load curriculum JSON if available
    let curriculumData: any = null;
    const jsonFileName = courseJsonMap[courseData.id];
    if (jsonFileName) {
      try {
        const jsonPath = path.join(process.cwd(), 'src', 'data', jsonFileName);
        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        curriculumData = JSON.parse(jsonContent);
      } catch (error) {
        console.warn(`⚠️  Could not load curriculum JSON for ${courseData.id}:`, error);
      }
    }

    // Create course with curriculum metadata
    const course = await prisma.course.create({
      data: {
        id: courseData.id,
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        imageUrl: courseData.imageUrl || '',
        order: courseData.order,
        isActive: true,
        // Add curriculum metadata from JSON
        duration: curriculumData?.duration || null,
        mode: curriculumData?.mode || null,
        programOverview: curriculumData?.programOverview || null,
        capstone: curriculumData?.capstone || null,
        industryExposure: curriculumData?.industryExposure || null,
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
      include: { topics: true },
    });
    console.log(`  ✓ Created course: ${course.title} with ${courseData.topics.length} topics`);

    // Create CurriculumWeek entries with detailed curriculum data
    if (curriculumData?.curriculum && Array.isArray(curriculumData.curriculum)) {
      console.log(`    📖 Adding ${curriculumData.curriculum.length} curriculum weeks...`);
      
      for (const week of curriculumData.curriculum) {
        // Find corresponding topic by week order
        const correspondingTopic = courseData.topics[week.week - 1];
        
        await prisma.curriculumWeek.create({
          data: {
            weekNumber: week.week,
            title: week.title,
            courseId: courseData.id,
            topicId: correspondingTopic?.id || null,
            coreObjectives: week.coreObjectives || null,
            conceptsCovered: week.conceptsCovered || null,
            practicalImplementation: week.practicalImplementation || null,
            weeklyDeliverable: week.weeklyDeliverable || null,
            mentorValidation: week.mentorValidation || null,
            evaluationCheckpoint: week.evaluationCheckpoint || null,
            isActive: true,
          },
        });
      }
      console.log(`    ✓ Curriculum weeks linked`);
    }
  }

  // Seed Questions (using batch inserts for better performance)
  console.log('📝 Seeding questions...');
  
  const allQuestions = [
    ...marketingQuestions,
    ...dataAnalystQuestions,
    ...productStrategistQuestions,
  ];

  // Prepare questions data
  const questionsData = allQuestions.map((question) => ({
    question: question.question,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    difficulty: toDifficulty(question.difficulty),
    tags: question.tags,
    topicId: question.topicId,
    courseId: question.courseId,
    isActive: true,
  }));

  // Insert in batches of 100 for better performance
  const batchSize = 100;
  for (let i = 0; i < questionsData.length; i += batchSize) {
    const batch = questionsData.slice(i, i + batchSize);
    await prisma.question.createMany({
      data: batch,
    });
    const seededCount = Math.min(i + batchSize, questionsData.length);
    console.log(`  ✓ Seeded ${seededCount} questions...`);
  }

  console.log(`  ✓ Total questions seeded: ${allQuestions.length}`);

  // Summary
  const courses = await prisma.course.count();
  const topics = await prisma.topic.count();
  const questions = await prisma.question.count();
  const curriculumWeeks = await prisma.curriculumWeek.count();

  console.log('\n📊 Seed Summary:');
  console.log(`  • Courses: ${courses}`);
  console.log(`  • Topics: ${topics}`);
  console.log(`  • Curriculum Weeks: ${curriculumWeeks}`);
  console.log(`  • Questions: ${questions}`);
  console.log('\n✨ Database seed completed successfully!');
  console.log('   - Courses now include: duration, mode, programOverview, capstone, industryExposure');
  console.log('   - Curriculum weeks mapped with learning objectives, concepts, and mentor validations');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
