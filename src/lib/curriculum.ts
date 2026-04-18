import fs from 'fs';
import path from 'path';

export interface CourseData {
  courseId: string;
  slug: string;
  title: string;
  duration: string;
  mode: string;
  programOverview: Record<string, any>;
  curriculum: Record<string, any>[];
  capstone: Record<string, any>;
  industryExposure: Record<string, any>;
}

export interface CurriculumWeek {
  week: number | string;
  title: string;
  coreObjectives: string[];
  practicalImplementation: string[];
  weeklyDeliverable: string | string[];
  evaluationCheckpoint: string;
  mentorValidation: string[];
}

export interface CourseCurriculum {
  programTitle: string;
  duration: string;
  mode: string;
  weeks: CurriculumWeek[];
}

export interface CourseProgramContent {
  courseSlug: string;
  courseData: CourseData | null;
}

// Slug to JSON file mapping
const courseJsonFileMap: Record<string, string> = {
  'ai-product-automation-strategist': 'ai-product-automation-strategist.json',
  'ai-data-analyst': 'ai-data-analyst.json',
  'ai-marketing-intelligence': 'ai-marketing-intelligence.json',
};

/**
 * Load course data from JSON file
 */
export function getCourseDataBySlug(courseSlug: string): CourseData | null {
  try {
    const jsonFileName = courseJsonFileMap[courseSlug];
    if (!jsonFileName) return null;

    const jsonPath = path.join(process.cwd(), 'src', 'data', jsonFileName);
    
    if (!fs.existsSync(jsonPath)) {
      console.warn(`Course JSON file not found: ${jsonPath}`);
      return null;
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const courseData = JSON.parse(jsonContent) as CourseData;
    
    return courseData;
  } catch (error) {
    console.error(`Error loading course data for ${courseSlug}:`, error);
    return null;
  }
}

/**
 * Get the full course program content by slug
 */
export function getProgramContentByCourseSlug(courseSlug: string): CourseProgramContent {
  const courseData = getCourseDataBySlug(courseSlug);
  
  return {
    courseSlug,
    courseData,
  };
}
