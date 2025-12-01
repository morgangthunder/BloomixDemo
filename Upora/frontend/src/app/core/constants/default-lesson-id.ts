/**
 * Default/Placeholder Lesson ID
 * 
 * This ID is used for content sources and processed content items that are not yet
 * linked to a specific lesson. It allows:
 * - All content to have a non-null lessonId (database constraint compliance)
 * - Easy querying for "unlinked" content (where lessonId = DEFAULT_LESSON_ID)
 * - Frontend can show "No associated lessons" when only this ID is present
 * - Backend queries can still find content even when not explicitly linked
 * 
 * This ID should NEVER be used for an actual lesson.
 */
export const DEFAULT_LESSON_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Check if a lesson ID is the default/placeholder ID
 */
export function isDefaultLessonId(lessonId: string | null | undefined): boolean {
  return lessonId === DEFAULT_LESSON_ID || !lessonId;
}


