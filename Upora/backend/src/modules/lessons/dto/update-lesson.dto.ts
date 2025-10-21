// Temporary: Partial<CreateLessonDto> for MVP
// TODO: Add @nestjs/mapped-types when package issue is resolved

export class UpdateLessonDto {
  title?: string;
  description?: string;
  data?: any;
  status?: string;
}
