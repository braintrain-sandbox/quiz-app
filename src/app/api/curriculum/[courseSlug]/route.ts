import { NextResponse } from 'next/server';
import { getProgramContentByCourseSlug } from '@/lib/curriculum';

export const runtime = 'nodejs';

// GET /api/curriculum/[courseSlug] - Get curriculum structure for a course
export async function GET(
  request: Request,
  { params }: { params: { courseSlug: string } }
) {
  try {
    const { courseData } = getProgramContentByCourseSlug(params.courseSlug);

    if (!courseData) {
      return NextResponse.json(
        { error: 'Program content not found for this course' },
        { status: 404 }
      );
    }

    return NextResponse.json(courseData);
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum' },
      { status: 500 }
    );
  }
}
