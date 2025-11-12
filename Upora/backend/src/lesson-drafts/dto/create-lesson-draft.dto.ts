export class CreateLessonDraftDto {
  lessonId: string;
  tenantId: string;
  accountId: string;
  draftData: any;
  changeSummary?: string;
  changesCount?: number;
}

