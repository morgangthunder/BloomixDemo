import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { Lesson } from '../../entities/lesson.entity';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
  ) {}

  // ════════════════════════════════════════
  // Permission Helpers
  // ════════════════════════════════════════

  private assertCanManage(course: Course, userId: string, userRole?: string): void {
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    if (!isAdmin && course.createdBy !== userId) {
      throw new ForbiddenException('Only the course creator or an admin can manage this course');
    }
  }

  // ════════════════════════════════════════
  // CRUD
  // ════════════════════════════════════════

  /** List all courses for a creator (or all for admin) */
  async getCourses(userId: string, userRole?: string, tenantId?: string): Promise<Course[]> {
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    const where: any = {};
    if (!isAdmin) {
      where.createdBy = userId;
    }
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const courses = await this.courseRepo.find({
      where,
      relations: ['lessons'],
      order: { createdAt: 'DESC' },
    });
    return courses;
  }

  /** List all approved/published courses (for homepage/public discovery) */
  async getApprovedCourses(): Promise<Course[]> {
    return this.courseRepo.find({
      where: [
        { status: 'approved' },
        { status: 'published' },
      ],
      relations: ['lessons'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Get a single course with its lessons */
  async getCourse(courseId: string, userId?: string, userRole?: string): Promise<Course> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['lessons'],
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  /** Create a new course */
  async createCourse(
    userId: string,
    tenantId: string,
    data: { title: string; description?: string },
  ): Promise<Course> {
    if (!data.title?.trim()) {
      throw new BadRequestException('Course title is required');
    }
    const course = this.courseRepo.create({
      title: data.title.trim(),
      description: data.description?.trim() || null,
      createdBy: userId,
      tenantId,
      status: 'draft',
    } as Partial<Course>);
    const saved = await this.courseRepo.save(course) as Course;
    this.logger.log(`Course created: ${saved.id} by ${userId}`);
    return saved;
  }

  /** Update a course */
  async updateCourse(
    courseId: string,
    userId: string,
    data: { title?: string; description?: string; status?: string; accessLevel?: string; requiredSubscriptionTier?: string | null },
    userRole?: string,
  ): Promise<Course> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertCanManage(course, userId, userRole);

    if (data.title !== undefined) course.title = data.title.trim();
    if (data.description !== undefined) course.description = data.description?.trim() || null as any;
    if (data.status !== undefined) course.status = data.status;
    if (data.accessLevel !== undefined) course.accessLevel = data.accessLevel;
    if (data.requiredSubscriptionTier !== undefined) course.requiredSubscriptionTier = data.requiredSubscriptionTier;

    const saved = await this.courseRepo.save(course);
    this.logger.log(`Course updated: ${saved.id}`);
    return saved;
  }

  /** Delete a course (unlinks lessons, does not delete them) */
  async deleteCourse(courseId: string, userId: string, userRole?: string): Promise<void> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertCanManage(course, userId, userRole);

    // Unlink all lessons from this course
    await this.lessonRepo
      .createQueryBuilder()
      .update(Lesson)
      .set({ courseId: null })
      .where('course_id = :courseId', { courseId })
      .execute();

    await this.courseRepo.remove(course);
    this.logger.log(`Course deleted: ${courseId}`);
  }

  // ════════════════════════════════════════
  // Lesson Management within Course
  // ════════════════════════════════════════

  /** Add a lesson to a course */
  async addLesson(
    courseId: string,
    lessonId: string,
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean }> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertCanManage(course, userId, userRole);

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (lesson.courseId === courseId) {
      throw new BadRequestException('Lesson is already in this course');
    }

    lesson.courseId = courseId;
    await this.lessonRepo.save(lesson);
    this.logger.log(`Lesson ${lessonId} added to course ${courseId}`);
    return { success: true };
  }

  /** Remove a lesson from a course */
  async removeLesson(
    courseId: string,
    lessonId: string,
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean }> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertCanManage(course, userId, userRole);

    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.courseId !== courseId) {
      throw new BadRequestException('Lesson is not in this course');
    }

    lesson.courseId = null;
    await this.lessonRepo.save(lesson);
    this.logger.log(`Lesson ${lessonId} removed from course ${courseId}`);
    return { success: true };
  }

  /** Reorder lessons within a course */
  async reorderLessons(
    courseId: string,
    lessonIds: string[],
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean }> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    this.assertCanManage(course, userId, userRole);

    for (let i = 0; i < lessonIds.length; i++) {
      await this.lessonRepo
        .createQueryBuilder()
        .update(Lesson)
        .set({ sortOrder: i } as any)
        .where('id = :id AND course_id = :courseId', { id: lessonIds[i], courseId })
        .execute();
    }
    this.logger.log(`Reordered ${lessonIds.length} lessons in course ${courseId}`);
    return { success: true };
  }

  /** Get lessons in a course */
  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.lessonRepo.find({
      where: { courseId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }
}
