import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { LessonGroup, GroupMember } from '../../entities/lesson-group.entity';
import { Assignment, AssignmentSubmission, UserLessonDeadline, AssignmentType, SubmissionStatus } from '../../entities/assignment.entity';
import { CourseGroupLessonVisibility } from '../../entities/course-group-lesson-visibility.entity';
import { Course } from '../../entities/course.entity';
import { Lesson } from '../../entities/lesson.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { FileStorageService } from '../../services/file-storage.service';
import { ChatGateway } from '../../gateway/chat.gateway';

@Injectable()
export class LessonGroupsService {
  private readonly logger = new Logger(LessonGroupsService.name);

  constructor(
    @InjectRepository(LessonGroup) private readonly groupRepo: Repository<LessonGroup>,
    @InjectRepository(GroupMember) private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission) private readonly submissionRepo: Repository<AssignmentSubmission>,
    @InjectRepository(UserLessonDeadline) private readonly deadlineRepo: Repository<UserLessonDeadline>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(CourseGroupLessonVisibility) private readonly visibilityRepo: Repository<CourseGroupLessonVisibility>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Usage) private readonly usageRepo: Repository<Usage>,
    @InjectRepository(UserInteractionProgress) private readonly progressRepo: Repository<UserInteractionProgress>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    private readonly fileStorage: FileStorageService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ════════════════════════════════════════
  // Permission Helpers
  // ════════════════════════════════════════

  private async assertCanManageLesson(lessonId: string, userId: string, userRole?: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    const isCreator = lesson.createdBy === userId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only the lesson creator or an admin can manage this lesson\'s groups');
    }
    return lesson;
  }

  private async assertCanManageCourse(courseId: string, userId: string, userRole?: string): Promise<Course> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    if (!isAdmin && course.createdBy !== userId) {
      throw new ForbiddenException('Only the course creator or an admin can manage this course\'s groups');
    }
    return course;
  }

  private async assertCanManageGroup(groupId: string, userId: string, userRole?: string): Promise<LessonGroup> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    // Course group — check course permission
    if (group.courseId && !group.lessonId) {
      await this.assertCanManageCourse(group.courseId, userId, userRole);
    } else if (group.lessonId) {
      await this.assertCanManageLesson(group.lessonId, userId, userRole);
    }
    return group;
  }

  // ════════════════════════════════════════
  // GROUPS CRUD
  // ════════════════════════════════════════

  /** Get or create the default group for a lesson */
  async getOrCreateDefaultGroup(lessonId: string, userId: string): Promise<LessonGroup> {
    let defaultGroup = await this.groupRepo.findOne({
      where: { lessonId, isDefault: true },
    });
    if (!defaultGroup) {
      defaultGroup = this.groupRepo.create({
        lessonId,
        name: 'All Engagers',
        description: 'Default group — automatically includes all users who have viewed or interacted with this lesson.',
        isDefault: true,
        createdBy: userId,
      });
      defaultGroup = await this.groupRepo.save(defaultGroup);
      this.logger.log(`Created default group for lesson ${lessonId}: ${defaultGroup.id}`);
    }
    return defaultGroup;
  }

  /** List all groups for a lesson (default + custom) */
  async getGroups(lessonId: string, userId: string, userRole?: string): Promise<any[]> {
    await this.assertCanManageLesson(lessonId, userId, userRole);
    await this.getOrCreateDefaultGroup(lessonId, userId);

    // Only return "pure" lesson groups — exclude auto-created children of course groups
    const groups = await this.groupRepo.find({
      where: { lessonId, parentCourseGroupId: IsNull() },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    // Attach member counts
    const result = await Promise.all(groups.map(async (g) => {
      const memberCount = g.isDefault
        ? await this.getDefaultGroupMemberCount(lessonId)
        : await this.memberRepo.count({ where: { groupId: g.id } });
      const assignmentCount = await this.assignmentRepo.count({
        where: [
          { groupId: g.id },
          { lessonId, groupId: null as any }, // IS NULL — lesson-wide assignments
        ],
      });
      return { ...g, memberCount, assignmentCount };
    }));

    return result;
  }

  /** Create a custom group */
  async createGroup(lessonId: string, userId: string, name: string, description?: string, userRole?: string): Promise<LessonGroup> {
    await this.assertCanManageLesson(lessonId, userId, userRole);
    const group = this.groupRepo.create({
      lessonId,
      name,
      description: description || null,
      isDefault: false,
      createdBy: userId,
    });
    return this.groupRepo.save(group);
  }

  /** Update a custom group */
  async updateGroup(groupId: string, userId: string, updates: { name?: string; description?: string }, userRole?: string): Promise<LessonGroup> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);
    if (group.isDefault) throw new BadRequestException('Cannot edit the default group');
    if (updates.name !== undefined) group.name = updates.name;
    if (updates.description !== undefined) group.description = updates.description;
    return this.groupRepo.save(group);
  }

  /** Delete a custom group (not default) */
  async deleteGroup(groupId: string, userId: string, userRole?: string): Promise<{ deletedGroupName: string; notifiedCount: number }> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);
    if (group.isDefault) throw new BadRequestException('Cannot delete the default group');

    // Collect all member userIds to notify (this group + child groups for course groups)
    const groupIdsToNotify = [groupId];
    const isCourseGroup = !!group.courseId && !group.lessonId;
    if (isCourseGroup) {
      const childGroups = await this.groupRepo.find({ where: { parentCourseGroupId: groupId } });
      groupIdsToNotify.push(...childGroups.map((cg) => cg.id));
    }

    // Fetch all members with user accounts across all affected groups
    const allMembers = await this.memberRepo.find({
      where: { groupId: In(groupIdsToNotify) },
    });
    const uniqueUserIds = [...new Set(allMembers.filter((m) => m.userId).map((m) => m.userId!))];

    // Build context name for the notification
    let contextName = group.name;
    if (group.lessonId) {
      const lesson = await this.lessonRepo.findOne({ where: { id: group.lessonId } });
      if (lesson) contextName = `${group.name} (${lesson.title})`;
    } else if (group.courseId) {
      const course = await this.courseRepo.findOne({ where: { id: group.courseId } });
      if (course) contextName = `${group.name} (${course.title})`;
    }

    // Resolve deleter name
    const deleter = await this.userRepo.findOne({ where: { id: userId } });
    const deleterName = deleter?.username || deleter?.email?.split('@')[0] || 'A manager';

    // Create notifications for each member (excluding the deleter themselves)
    let notifiedCount = 0;
    for (const memberUserId of uniqueUserIds) {
      if (memberUserId === userId) continue; // Don't notify the person who deleted it
      try {
        const notification = this.notificationRepo.create({
          userId: memberUserId,
          type: NotificationType.GROUP_DELETED,
          title: 'Group Deleted',
          body: `${deleterName} deleted the group "${contextName}". You have been removed from this group.`,
          actionUrl: '/my-lessons',
          fromUserId: userId,
          toUserId: memberUserId,
        });
        await this.notificationRepo.save(notification);
        this.chatGateway.emitToUser(memberUserId, 'new_notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
        });
        notifiedCount++;
      } catch (err) {
        this.logger.warn(`Failed to notify user ${memberUserId} about group deletion: ${err}`);
      }
    }

    // Delete the group (FK cascades handle members + child groups)
    const deletedName = group.name;
    await this.groupRepo.remove(group);
    this.logger.log(`Group "${deletedName}" (${groupId}) deleted by ${userId}. ${notifiedCount} members notified.`);

    return { deletedGroupName: deletedName, notifiedCount };
  }

  // ════════════════════════════════════════
  // GROUP MEMBERS
  // ════════════════════════════════════════

  /** Get member count for default group (derived from engagers) */
  private async getDefaultGroupMemberCount(lessonId: string): Promise<number> {
    const result = await this.usageRepo.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT user_id FROM usages WHERE resource_type = 'lesson' AND resource_id = $1 AND action IN ('view', 'complete')
        UNION
        SELECT user_id FROM user_interaction_progress WHERE lesson_id = $1
      ) combined`,
      [lessonId],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  /** Get members of a group (default = engagers, custom = group_members) */
  async getMembers(groupId: string, userId: string, searchQuery?: string, userRole?: string): Promise<any[]> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);

    if (group.isDefault && group.courseId && !group.lessonId) {
      return this.getDefaultCourseGroupMembers(group.courseId, searchQuery);
    }
    if (group.isDefault && group.lessonId) {
      return this.getDefaultGroupMembers(group.lessonId, searchQuery);
    }

    // Custom group: get from group_members with user details
    let query = this.memberRepo
      .createQueryBuilder('gm')
      .leftJoinAndSelect('gm.user', 'u')
      .where('gm.groupId = :groupId', { groupId });

    if (searchQuery?.trim()) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      query = query.andWhere(
        '(LOWER(u.email) LIKE :term OR LOWER(COALESCE(u.username, \'\')) LIKE :term)',
        { term },
      );
    }

    const members = await query.orderBy('gm.createdAt', 'ASC').getMany();
    return members.map((m) => ({
      id: m.userId,
      email: m.user?.email || m.email || '(unknown)',
      name: m.user?.username || m.user?.email?.split('@')[0] || m.email?.split('@')[0] || 'Unknown',
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      invitedAt: m.invitedAt,
    }));
  }

  /** Get default group members (derived from engagers) */
  private async getDefaultGroupMembers(lessonId: string, searchQuery?: string): Promise<any[]> {
    // Same logic as LessonsService.getEngagers but simplified
    const allUserIdsResult = await this.usageRepo.query(
      `SELECT DISTINCT user_id as "userId" FROM (
        SELECT user_id FROM usages WHERE resource_type = 'lesson' AND resource_id = $1 AND action IN ('view', 'complete')
        UNION
        SELECT user_id FROM user_interaction_progress WHERE lesson_id = $1
      ) combined`,
      [lessonId],
    );

    const allUserIds = allUserIdsResult.map((r: any) => r.userId);
    if (allUserIds.length === 0) return [];

    let userQuery = this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: allUserIds });

    if (searchQuery?.trim()) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      userQuery = userQuery.andWhere(
        '(LOWER(u.email) LIKE :term OR LOWER(COALESCE(u.username, \'\')) LIKE :term)',
        { term },
      );
    }

    const users = await userQuery.orderBy('u.createdAt', 'DESC').getMany();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.username || u.email?.split('@')[0] || 'Unknown',
      role: 'member',
      joinedAt: null,
      invitedAt: null,
    }));
  }

  /** Add a member to a custom group */
  async addMember(groupId: string, targetUserId: string, requestingUserId: string, userRole?: string): Promise<GroupMember> {
    const group = await this.assertCanManageGroup(groupId, requestingUserId, userRole);
    if (group.isDefault) throw new BadRequestException('Cannot manually add members to the default group');

    // Check if user exists
    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    // Check if already a member
    const existing = await this.memberRepo.findOne({ where: { groupId, userId: targetUserId } });
    if (existing) throw new BadRequestException('User is already a member of this group');

    const member = this.memberRepo.create({
      groupId,
      userId: targetUserId,
      role: 'member',
      invitedBy: requestingUserId,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });
    return this.memberRepo.save(member);
  }

  /** Remove a member from a custom group */
  async removeMember(groupId: string, targetUserId: string, requestingUserId: string, userRole?: string): Promise<void> {
    const group = await this.assertCanManageGroup(groupId, requestingUserId, userRole);
    if (group.isDefault) throw new BadRequestException('Cannot remove members from the default group');

    const member = await this.memberRepo.findOne({ where: { groupId, userId: targetUserId } });
    if (!member) throw new NotFoundException('Member not found');
    await this.memberRepo.remove(member);
  }

  // ════════════════════════════════════════
  // ASSIGNMENTS
  // ════════════════════════════════════════

  /** List assignments for a lesson (optionally filtered by group) */
  async getAssignments(lessonId: string, userId: string, groupId?: string, userRole?: string): Promise<Assignment[]> {
    await this.assertCanManageLesson(lessonId, userId, userRole);

    const where: any = { lessonId };
    if (groupId) {
      // Get group-specific + lesson-wide (groupId IS NULL)
      return this.assignmentRepo
        .createQueryBuilder('a')
        .where('a.lessonId = :lessonId', { lessonId })
        .andWhere('(a.groupId = :groupId OR a.groupId IS NULL)', { groupId })
        .orderBy('a.sortOrder', 'ASC')
        .addOrderBy('a.createdAt', 'ASC')
        .getMany();
    }

    return this.assignmentRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Create an assignment */
  async createAssignment(
    lessonId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      type?: AssignmentType;
      groupId?: string;
      allowedFileTypes?: string;
      maxFileSizeBytes?: number;
      maxScore?: number;
      stageId?: string;
      substageId?: string;
      sortOrder?: number;
      isPublished?: boolean;
    },
    userRole?: string,
  ): Promise<Assignment> {
    await this.assertCanManageLesson(lessonId, userId, userRole);

    const assignment = this.assignmentRepo.create({
      lessonId,
      groupId: data.groupId || undefined,
      title: data.title,
      description: data.description || undefined,
      type: data.type || AssignmentType.OFFLINE,
      allowedFileTypes: data.allowedFileTypes || undefined,
      maxFileSizeBytes: data.maxFileSizeBytes ?? 52428800,
      maxScore: data.maxScore ?? 100,
      stageId: data.stageId || undefined,
      substageId: data.substageId || undefined,
      sortOrder: data.sortOrder ?? 0,
      isPublished: data.isPublished ?? true,
      createdBy: userId,
    });
    return this.assignmentRepo.save(assignment as Assignment);
  }

  /** Update an assignment */
  async updateAssignment(assignmentId: string, userId: string, updates: Partial<Assignment>, userRole?: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertCanManageLesson(assignment.lessonId, userId, userRole);

    const allowedFields = ['title', 'description', 'type', 'groupId', 'allowedFileTypes', 'maxFileSizeBytes', 'maxScore', 'stageId', 'substageId', 'sortOrder', 'isPublished'];
    for (const key of allowedFields) {
      if ((updates as any)[key] !== undefined) {
        (assignment as any)[key] = (updates as any)[key];
      }
    }
    return this.assignmentRepo.save(assignment);
  }

  /** Delete an assignment */
  async deleteAssignment(assignmentId: string, userId: string, userRole?: string): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertCanManageLesson(assignment.lessonId, userId, userRole);
    await this.assignmentRepo.remove(assignment);
  }

  // ════════════════════════════════════════
  // SUBMISSIONS
  // ════════════════════════════════════════

  /** Get all submissions for an assignment (creator view) */
  async getSubmissions(assignmentId: string, userId: string, userRole?: string): Promise<any[]> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertCanManageLesson(assignment.lessonId, userId, userRole);

    const submissions = await this.submissionRepo.find({
      where: { assignmentId },
      relations: ['user'],
      order: { submittedAt: 'DESC' },
    });

    return submissions.map((s) => ({
      id: s.id,
      assignmentId: s.assignmentId,
      userId: s.userId,
      userName: s.user?.username || s.user?.email?.split('@')[0] || 'Unknown',
      userEmail: s.user?.email || '',
      status: s.status,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      fileSize: s.fileSize,
      studentComment: s.studentComment,
      score: s.score,
      graderFeedback: s.graderFeedback,
      gradedBy: s.gradedBy,
      gradedAt: s.gradedAt,
      submittedAt: s.submittedAt,
      isLate: s.isLate,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /** Student submits an assignment (text or file) */
  async submitAssignment(
    assignmentId: string,
    userId: string,
    data: { comment?: string; file?: { buffer: Buffer; originalname: string; mimetype?: string; size?: number } },
  ): Promise<AssignmentSubmission> {
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (!assignment.isPublished) throw new BadRequestException('This assignment is not published');

    // Get or create submission record
    let submission = await this.submissionRepo.findOne({
      where: { assignmentId, userId },
    });

    if (!submission) {
      submission = this.submissionRepo.create({ assignmentId, userId });
    }

    // Check if resubmission is allowed
    if (submission.status === SubmissionStatus.GRADED) {
      throw new BadRequestException('This assignment has already been graded. Contact your teacher if you need to resubmit.');
    }

    // Handle file upload for file-type assignments
    if (assignment.type === AssignmentType.FILE && data.file) {
      // Validate file type
      if (assignment.allowedFileTypes) {
        const allowed = assignment.allowedFileTypes.split(',').map((t) => t.trim().toLowerCase());
        const ext = data.file.originalname.split('.').pop()?.toLowerCase() || '';
        if (!allowed.includes(ext)) {
          throw new BadRequestException(`File type .${ext} not allowed. Allowed: ${assignment.allowedFileTypes}`);
        }
      }

      // Validate file size
      const maxSize = assignment.maxFileSizeBytes || 52428800;
      if (data.file.buffer.length > maxSize) {
        throw new BadRequestException(`File too large. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Upload file
      const subfolder = `assignments/${assignmentId}/${userId}`;
      const result = await this.fileStorage.saveFile(data.file, subfolder);
      submission.fileUrl = result.url;
      submission.fileName = data.file.originalname;
      submission.fileSize = data.file.buffer.length;
    }

    if (data.comment !== undefined) {
      submission.studentComment = data.comment;
    }

    // Check deadline for late flag
    const deadline = await this.deadlineRepo.findOne({
      where: { userId, lessonId: assignment.lessonId },
      order: { deadlineAt: 'ASC' },
    });
    if (deadline && new Date() > new Date(deadline.deadlineAt)) {
      submission.isLate = true;
    }

    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();

    return this.submissionRepo.save(submission);
  }

  /** Creator grades a submission */
  async gradeSubmission(
    submissionId: string,
    graderId: string,
    data: { score: number; feedback?: string },
    userRole?: string,
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.assertCanManageLesson(submission.assignment.lessonId, graderId, userRole);

    if (data.score < 0 || data.score > submission.assignment.maxScore) {
      throw new BadRequestException(`Score must be between 0 and ${submission.assignment.maxScore}`);
    }

    submission.score = data.score;
    submission.graderFeedback = data.feedback || null;
    submission.gradedBy = graderId;
    submission.gradedAt = new Date();
    submission.status = SubmissionStatus.GRADED;

    return this.submissionRepo.save(submission);
  }

  /** Creator requests resubmission */
  async requestResubmission(
    submissionId: string,
    graderId: string,
    feedback?: string,
    userRole?: string,
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.assertCanManageLesson(submission.assignment.lessonId, graderId, userRole);

    submission.status = SubmissionStatus.RESUBMIT_REQUESTED;
    submission.graderFeedback = feedback || 'Resubmission requested';
    submission.gradedBy = graderId;

    return this.submissionRepo.save(submission);
  }

  /** Student's "My Assignments" — all their assignments across lessons */
  async getMyAssignments(userId: string): Promise<any[]> {
    // Find all lessons this user has engaged with
    const lessonIdsResult = await this.usageRepo.query(
      `SELECT DISTINCT resource_id as "lessonId" FROM usages
       WHERE user_id = $1 AND resource_type = 'lesson' AND action IN ('view', 'complete')`,
      [userId],
    );
    const lessonIds = lessonIdsResult.map((r: any) => r.lessonId);
    if (lessonIds.length === 0) return [];

    // Get all published assignments for those lessons
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.lesson', 'l')
      .where('a.lessonId IN (:...lessonIds)', { lessonIds })
      .andWhere('a.isPublished = true')
      .orderBy('a.lessonId', 'ASC')
      .addOrderBy('a.sortOrder', 'ASC')
      .getMany();

    if (assignments.length === 0) return [];

    // Get all submissions for this user
    const assignmentIds = assignments.map((a) => a.id);
    const submissions = await this.submissionRepo.find({
      where: { userId, assignmentId: In(assignmentIds) },
    });
    const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]));

    // Get deadlines
    const deadlines = await this.deadlineRepo.find({
      where: { userId, lessonId: In(lessonIds) },
    });
    const deadlineMap = new Map(deadlines.map((d) => [d.lessonId, d]));

    return assignments.map((a) => {
      const sub = submissionMap.get(a.id);
      const deadline = deadlineMap.get(a.lessonId);
      return {
        id: a.id,
        lessonId: a.lessonId,
        lessonTitle: a.lesson?.title || 'Unknown Lesson',
        title: a.title,
        description: a.description,
        type: a.type,
        maxScore: a.maxScore,
        status: sub?.status || SubmissionStatus.NOT_STARTED,
        score: sub?.score ?? null,
        graderFeedback: sub?.graderFeedback ?? null,
        submittedAt: sub?.submittedAt ?? null,
        gradedAt: sub?.gradedAt ?? null,
        isLate: sub?.isLate ?? false,
        fileUrl: sub?.fileUrl ?? null,
        fileName: sub?.fileName ?? null,
        deadline: deadline?.deadlineAt ?? null,
        deadlineNote: deadline?.note ?? null,
      };
    });
  }

  // ════════════════════════════════════════
  // DEADLINES
  // ════════════════════════════════════════

  /** List deadlines for a lesson */
  async getDeadlines(lessonId: string, userId: string, userRole?: string): Promise<UserLessonDeadline[]> {
    await this.assertCanManageLesson(lessonId, userId, userRole);
    return this.deadlineRepo.find({
      where: { lessonId },
      relations: ['user'],
      order: { deadlineAt: 'ASC' },
    });
  }

  /** Set deadline for a single user */
  async setDeadline(
    lessonId: string,
    targetUserId: string,
    deadlineAt: Date,
    setByUserId: string,
    data?: { groupId?: string; courseId?: string; note?: string },
    userRole?: string,
  ): Promise<UserLessonDeadline> {
    await this.assertCanManageLesson(lessonId, setByUserId, userRole);

    // Upsert: update existing or create new
    let deadline = await this.deadlineRepo.findOne({
      where: { userId: targetUserId, lessonId },
    });

    if (deadline) {
      deadline.deadlineAt = deadlineAt;
      deadline.setByUserId = setByUserId;
      deadline.note = data?.note ?? deadline.note;
      deadline.groupId = data?.groupId ?? deadline.groupId;
      deadline.courseId = data?.courseId ?? deadline.courseId;
    } else {
      deadline = this.deadlineRepo.create({
        userId: targetUserId,
        lessonId,
        deadlineAt,
        setByUserId,
        groupId: data?.groupId || null,
        courseId: data?.courseId || null,
        note: data?.note || null,
      });
    }

    return this.deadlineRepo.save(deadline);
  }

  /** Set deadline for all members of a group (bulk) */
  async setBulkDeadline(
    lessonId: string,
    groupId: string,
    deadlineAt: Date,
    setByUserId: string,
    note?: string,
    userRole?: string,
  ): Promise<{ count: number }> {
    const group = await this.assertCanManageGroup(groupId, setByUserId, userRole);

    const members = await this.getMembers(groupId, setByUserId, undefined, userRole);
    let count = 0;
    for (const member of members) {
      await this.setDeadline(lessonId, member.id, deadlineAt, setByUserId, { groupId, note }, userRole);
      count++;
    }
    return { count };
  }

  /** Update a deadline */
  async updateDeadline(deadlineId: string, userId: string, updates: { deadlineAt?: Date; note?: string }, userRole?: string): Promise<UserLessonDeadline> {
    const deadline = await this.deadlineRepo.findOne({ where: { id: deadlineId } });
    if (!deadline) throw new NotFoundException('Deadline not found');
    await this.assertCanManageLesson(deadline.lessonId, userId, userRole);

    if (updates.deadlineAt !== undefined) deadline.deadlineAt = updates.deadlineAt;
    if (updates.note !== undefined) deadline.note = updates.note;
    return this.deadlineRepo.save(deadline);
  }

  /** Delete a deadline */
  async deleteDeadline(deadlineId: string, userId: string, userRole?: string): Promise<void> {
    const deadline = await this.deadlineRepo.findOne({ where: { id: deadlineId } });
    if (!deadline) throw new NotFoundException('Deadline not found');
    await this.assertCanManageLesson(deadline.lessonId, userId, userRole);
    await this.deadlineRepo.remove(deadline);
  }

  /** Student's upcoming deadlines */
  async getMyDeadlines(userId: string): Promise<any[]> {
    const deadlines = await this.deadlineRepo.find({
      where: { userId },
      relations: ['lesson'],
      order: { deadlineAt: 'ASC' },
    });

    return deadlines.map((d) => ({
      id: d.id,
      lessonId: d.lessonId,
      lessonTitle: d.lesson?.title || 'Unknown Lesson',
      deadlineAt: d.deadlineAt,
      note: d.note,
      isPast: new Date() > new Date(d.deadlineAt),
    }));
  }

  // ════════════════════════════════════════
  // PROGRESS (aggregate interaction data)
  // ════════════════════════════════════════

  /** Get progress by group ID only (looks up lessonId from the group) */
  async getGroupProgressByGroupId(groupId: string, userId: string, userRole?: string): Promise<any[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.lessonId) {
      return this.getCourseGroupProgress(groupId, userId, userRole);
    }
    return this.getGroupProgress(groupId, group.lessonId!, userId, userRole);
  }

  /**
   * Check if user can manage a group (owner/admin).
   * Returns true if owner/admin, false if just a member.
   * Throws ForbiddenException if not even a member.
   */
  private async canManageGroupOrIsMember(groupId: string, userId: string, userRole?: string): Promise<boolean> {
    const isAdmin = userRole === 'admin' || userRole === 'super-admin';
    if (isAdmin) return true;

    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    // Check if user is the content creator (lesson or course owner)
    if (group.courseId && !group.lessonId) {
      const course = await this.courseRepo.findOne({ where: { id: group.courseId } });
      if (course && course.createdBy === userId) return true;
    } else if (group.lessonId) {
      const lesson = await this.lessonRepo.findOne({ where: { id: group.lessonId } });
      if (lesson && lesson.createdBy === userId) return true;
    }

    // Check if user is a member of the group
    const isMember = await this.memberRepo.findOne({ where: { groupId, userId } });
    if (!isMember) throw new ForbiddenException('You are not a member of this group');
    return false;
  }

  /** Get progress summary for a group's members on a lesson */
  async getGroupProgress(groupId: string, lessonId: string, userId: string, userRole?: string): Promise<any[]> {
    const canSeeAll = await this.canManageGroupOrIsMember(groupId, userId, userRole);

    let members: any[];
    if (canSeeAll) {
      members = await this.getMembers(groupId, userId, undefined, userRole);
    } else {
      // Regular member — build a minimal member entry for just themselves
      const user = await this.userRepo.findOne({ where: { id: userId } });
      members = user ? [{ id: user.id, email: user.email, name: user.username || user.email, role: 'member' }] : [];
    }
    const memberIds = members.map((m: any) => m.id);
    if (memberIds.length === 0) return [];

    // Get interaction progress for all members
    const progress = await this.progressRepo.query(
      `SELECT user_id, COUNT(*) as interaction_count,
              AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score,
              SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count
       FROM user_interaction_progress
       WHERE lesson_id = $1 AND user_id = ANY($2)
       GROUP BY user_id`,
      [lessonId, memberIds],
    );
    const progressMap = new Map(progress.map((p: any) => [p.user_id, p]));

    // Get view/completion counts
    const usages = await this.usageRepo.query(
      `SELECT user_id, action, COUNT(*) as count
       FROM usages
       WHERE resource_type = 'lesson' AND resource_id = $1 AND user_id = ANY($2)
       GROUP BY user_id, action`,
      [lessonId, memberIds],
    );
    const usageMap = new Map<string, { views: number; completions: number }>();
    for (const u of usages) {
      const existing = usageMap.get(u.user_id) || { views: 0, completions: 0 };
      if (u.action === 'view') existing.views = parseInt(u.count, 10);
      if (u.action === 'complete') existing.completions = parseInt(u.count, 10);
      usageMap.set(u.user_id, existing);
    }

    // Get deadlines
    const deadlines = await this.deadlineRepo.find({
      where: { lessonId, userId: In(memberIds) },
    });
    const deadlineMap = new Map(deadlines.map((d) => [d.userId, d]));

    return members.map((m) => {
      const p: any = progressMap.get(m.id);
      const u = usageMap.get(m.id);
      const d = deadlineMap.get(m.id);
      return {
        ...m,
        views: u?.views ?? 0,
        completions: u?.completions ?? 0,
        interactionCount: parseInt(p?.interaction_count || '0', 10),
        completedInteractions: parseInt(p?.completed_count || '0', 10),
        averageScore: p?.avg_score != null ? Math.round(parseFloat(p.avg_score)) : null,
        deadline: d?.deadlineAt ?? null,
        deadlineNote: d?.note ?? null,
        isPastDeadline: d ? new Date() > new Date(d.deadlineAt) : false,
      };
    });
  }

  // ════════════════════════════════════════
  // COURSE GROUPS
  // ════════════════════════════════════════

  /** Get or create the default group for a course */
  async getOrCreateDefaultCourseGroup(courseId: string, userId: string): Promise<LessonGroup> {
    let defaultGroup = await this.groupRepo.findOne({
      where: { courseId, lessonId: IsNull(), isDefault: true },
    });
    if (!defaultGroup) {
      defaultGroup = this.groupRepo.create({
        courseId,
        lessonId: null as any,
        name: 'All Course Engagers',
        description: 'Default group — automatically includes all users who have engaged with any lesson in this course.',
        isDefault: true,
        createdBy: userId,
      });
      defaultGroup = await this.groupRepo.save(defaultGroup) as LessonGroup;
      this.logger.log(`Created default course group for course ${courseId}: ${defaultGroup.id}`);
    }
    return defaultGroup;
  }

  /** List all groups for a course (top-level course groups only, not child lesson groups) */
  async getCourseGroups(courseId: string, userId: string, userRole?: string): Promise<any[]> {
    await this.assertCanManageCourse(courseId, userId, userRole);
    await this.getOrCreateDefaultCourseGroup(courseId, userId);

    const groups = await this.groupRepo.find({
      where: { courseId, lessonId: IsNull() },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });

    const result = await Promise.all(groups.map(async (g) => {
      const memberCount = g.isDefault
        ? await this.getDefaultCourseGroupMemberCount(courseId)
        : await this.memberRepo.count({ where: { groupId: g.id } });
      return { ...g, memberCount };
    }));

    return result;
  }

  /** Get default course group member count (union of all lesson engagers) */
  private async getDefaultCourseGroupMemberCount(courseId: string): Promise<number> {
    const result = await this.usageRepo.query(
      `SELECT COUNT(DISTINCT combined.user_id) as count FROM (
        SELECT u.user_id FROM usages u
          JOIN lessons l ON l.id::text = u.resource_id::text
          WHERE l.course_id = $1::uuid AND u.resource_type = 'lesson' AND u.action IN ('view', 'complete')
        UNION
        SELECT p.user_id FROM user_interaction_progress p
          JOIN lessons l ON l.id = p.lesson_id
          WHERE l.course_id = $1::uuid
      ) combined`,
      [courseId],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  /** Get default course group members (union of all lesson engagers in the course) */
  async getDefaultCourseGroupMembers(courseId: string, searchQuery?: string): Promise<any[]> {
    const allUserIdsResult = await this.usageRepo.query(
      `SELECT DISTINCT combined.user_id as "userId" FROM (
        SELECT u.user_id FROM usages u
          JOIN lessons l ON l.id::text = u.resource_id::text
          WHERE l.course_id = $1::uuid AND u.resource_type = 'lesson' AND u.action IN ('view', 'complete')
        UNION
        SELECT p.user_id FROM user_interaction_progress p
          JOIN lessons l ON l.id = p.lesson_id
          WHERE l.course_id = $1::uuid
      ) combined`,
      [courseId],
    );

    const allUserIds = allUserIdsResult.map((r: any) => r.userId);
    if (allUserIds.length === 0) return [];

    let userQuery = this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: allUserIds });

    if (searchQuery?.trim()) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      userQuery = userQuery.andWhere(
        '(LOWER(u.email) LIKE :term OR LOWER(COALESCE(u.username, \'\')) LIKE :term)',
        { term },
      );
    }

    const users = await userQuery.orderBy('u.createdAt', 'DESC').getMany();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.username || u.email?.split('@')[0] || 'Unknown',
      role: 'member',
      joinedAt: null,
      invitedAt: null,
      status: 'joined',
    }));
  }

  /** Create a custom course group — also auto-creates child lesson groups for each lesson */
  async createCourseGroup(
    courseId: string,
    userId: string,
    name: string,
    description?: string,
    userRole?: string,
  ): Promise<LessonGroup> {
    await this.assertCanManageCourse(courseId, userId, userRole);

    const courseGroup = this.groupRepo.create({
      courseId,
      lessonId: null as any,
      name,
      description: description || null,
      isDefault: false,
      createdBy: userId,
    });
    const saved = await this.groupRepo.save(courseGroup) as LessonGroup;

    // Auto-create matching lesson groups for each lesson in the course
    const lessons = await this.lessonRepo.find({ where: { courseId } });
    for (const lesson of lessons) {
      const childGroup = this.groupRepo.create({
        lessonId: lesson.id,
        courseId,
        parentCourseGroupId: saved.id,
        name,
        description: `Auto-created from course group "${name}"`,
        isDefault: false,
        createdBy: userId,
      });
      await this.groupRepo.save(childGroup);
    }

    this.logger.log(`Course group created: ${saved.id} with ${lessons.length} child lesson groups`);
    return saved;
  }

  /** When a lesson is added to a course, auto-create child lesson groups for existing course groups */
  async syncLessonGroupsForNewLesson(courseId: string, lessonId: string, userId: string): Promise<void> {
    const courseGroups = await this.groupRepo.find({
      where: { courseId, lessonId: IsNull(), isDefault: false },
    });

    for (const cg of courseGroups) {
      // Check if a child group already exists
      const existing = await this.groupRepo.findOne({
        where: { lessonId, parentCourseGroupId: cg.id },
      });
      if (!existing) {
        const childGroup = this.groupRepo.create({
          lessonId,
          courseId,
          parentCourseGroupId: cg.id,
          name: cg.name,
          description: `Auto-created from course group "${cg.name}"`,
          isDefault: false,
          createdBy: userId,
        });
        const saved = await this.groupRepo.save(childGroup) as LessonGroup;

        // Copy members from course group to child lesson group
        const courseMembers = await this.memberRepo.find({ where: { groupId: cg.id } });
        for (const cm of courseMembers) {
          const childMember = this.memberRepo.create({
            groupId: saved.id,
            userId: cm.userId,
            email: cm.email,
            role: cm.role,
            status: cm.status,
            invitedBy: cm.invitedBy,
            invitedAt: cm.invitedAt,
            joinedAt: cm.joinedAt,
          });
          await this.memberRepo.save(childMember);
        }
      }
    }
  }

  // ════════════════════════════════════════
  // COURSE GROUP LESSON VISIBILITY
  // ════════════════════════════════════════

  /** Get visibility settings for a course group */
  async getCourseGroupLessonVisibility(groupId: string, userId: string, userRole?: string): Promise<any[]> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);
    if (!group.courseId) throw new BadRequestException('Not a course group');

    const lessons = await this.lessonRepo.find({
      where: { courseId: group.courseId },
      order: { createdAt: 'ASC' },
    });

    const visRows = await this.visibilityRepo.find({
      where: { courseGroupId: groupId },
    });
    const visMap = new Map(visRows.map((v) => [v.lessonId, v.isVisible]));

    return lessons.map((l) => ({
      lessonId: l.id,
      title: l.title,
      status: l.status,
      isVisible: visMap.has(l.id) ? visMap.get(l.id) : true, // default visible
    }));
  }

  /** Update visibility settings for a course group */
  async updateCourseGroupLessonVisibility(
    groupId: string,
    userId: string,
    updates: { lessonId: string; isVisible: boolean }[],
    userRole?: string,
  ): Promise<{ success: boolean }> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);
    if (!group.courseId) throw new BadRequestException('Not a course group');

    for (const u of updates) {
      let row = await this.visibilityRepo.findOne({
        where: { courseGroupId: groupId, lessonId: u.lessonId },
      });
      if (row) {
        row.isVisible = u.isVisible;
        await this.visibilityRepo.save(row);
      } else {
        row = this.visibilityRepo.create({
          courseGroupId: groupId,
          lessonId: u.lessonId,
          isVisible: u.isVisible,
        });
        await this.visibilityRepo.save(row);
      }
    }
    return { success: true };
  }

  // ════════════════════════════════════════
  // COURSE GROUP AGGREGATED DEADLINES
  // ════════════════════════════════════════

  /** Get deadlines for all lessons in a course (aggregated) */
  async getCourseGroupDeadlines(courseId: string, userId: string, userRole?: string): Promise<any[]> {
    await this.assertCanManageCourse(courseId, userId, userRole);

    const lessons = await this.lessonRepo.find({ where: { courseId } });
    if (lessons.length === 0) return [];

    const lessonIds = lessons.map((l) => l.id);
    const deadlines = await this.deadlineRepo.find({
      where: { lessonId: In(lessonIds) },
      relations: ['user', 'lesson'],
      order: { deadlineAt: 'ASC' },
    });

    return deadlines.map((d) => ({
      id: d.id,
      lessonId: d.lessonId,
      lessonTitle: d.lesson?.title || 'Unknown Lesson',
      userId: d.userId,
      userName: d.user?.username || d.user?.email?.split('@')[0] || 'Unknown',
      userEmail: d.user?.email || '',
      deadlineAt: d.deadlineAt,
      note: d.note,
      isPast: new Date() > new Date(d.deadlineAt),
    }));
  }

  /** Course group progress: aggregate across all lessons in the course */
  private async getCourseGroupProgress(groupId: string, userId: string, userRole?: string): Promise<any[]> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group || !group.courseId) return [];

    const canSeeAll = await this.canManageGroupOrIsMember(groupId, userId, userRole);
    let members: any[];
    if (canSeeAll) {
      members = await this.getMembers(groupId, userId, undefined, userRole);
    } else {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      members = user ? [{ id: user.id, email: user.email, name: user.username || user.email, role: 'member' }] : [];
    }
    const memberIds = members.map((m: any) => m.id);
    if (memberIds.length === 0) return [];

    const lessons = await this.lessonRepo.find({ where: { courseId: group.courseId } });
    if (lessons.length === 0) return members.map((m) => ({ ...m, views: 0, completions: 0, interactionCount: 0, completedInteractions: 0, averageScore: null, deadline: null, deadlineNote: null, isPastDeadline: false }));

    const lessonIds = lessons.map((l) => l.id);

    const progress = await this.progressRepo.query(
      `SELECT user_id, COUNT(*) as interaction_count,
              AVG(CASE WHEN score IS NOT NULL THEN score END) as avg_score,
              SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count
       FROM user_interaction_progress
       WHERE lesson_id = ANY($1) AND user_id = ANY($2)
       GROUP BY user_id`,
      [lessonIds, memberIds],
    );
    const progressMap = new Map(progress.map((p: any) => [p.user_id, p]));

    const usages = await this.usageRepo.query(
      `SELECT user_id, action, COUNT(*) as count
       FROM usages
       WHERE resource_type = 'lesson' AND resource_id = ANY($1) AND user_id = ANY($2)
       GROUP BY user_id, action`,
      [lessonIds.map(String), memberIds],
    );
    const usageMap = new Map<string, { views: number; completions: number }>();
    for (const u of usages) {
      const existing = usageMap.get(u.user_id) || { views: 0, completions: 0 };
      if (u.action === 'view') existing.views = parseInt(u.count, 10);
      if (u.action === 'complete') existing.completions = parseInt(u.count, 10);
      usageMap.set(u.user_id, existing);
    }

    return members.map((m) => {
      const p: any = progressMap.get(m.id);
      const usage = usageMap.get(m.id);
      return {
        ...m,
        views: usage?.views ?? 0,
        completions: usage?.completions ?? 0,
        interactionCount: parseInt(p?.interaction_count || '0', 10),
        completedInteractions: parseInt(p?.completed_count || '0', 10),
        averageScore: p?.avg_score != null ? Math.round(parseFloat(p.avg_score)) : null,
        deadline: null,
        deadlineNote: null,
        isPastDeadline: false,
      };
    });
  }

  // ════════════════════════════════════════
  // STUDENT "MY GROUPS" ENDPOINTS
  // ════════════════════════════════════════

  /** Get all groups the current user belongs to (for "My Lessons" page) */
  async getMyGroups(userId: string): Promise<any[]> {
    // Get explicit memberships (both joined AND invited)
    const memberships = await this.memberRepo.find({
      where: [
        { userId, status: 'joined' },
        { userId, status: 'invited' },
      ],
      relations: ['group'],
    });

    // Also find invites by email (for users who were invited before having an account)
    const user = await this.userRepo.findOne({ where: { id: userId } });
    let emailInvites: any[] = [];
    if (user?.email) {
      emailInvites = await this.memberRepo.find({
        where: { email: user.email, status: 'invited', userId: IsNull() },
        relations: ['group'],
      });
    }

    // Build explicit groups with membership status
    const explicitGroupsWithStatus = [
      ...memberships.map((m) => ({ group: m.group, membershipStatus: m.status })),
      ...emailInvites.map((m) => ({ group: m.group, membershipStatus: 'invited' as string })),
    ].filter((item) => !!item.group);

    // Get default groups for lessons this user has engaged with
    const engagedLessonIds = await this.usageRepo.query(
      `SELECT DISTINCT resource_id as "lessonId" FROM usages
       WHERE user_id = $1 AND resource_type = 'lesson' AND action IN ('view', 'complete')`,
      [userId],
    );
    const lessonIds = engagedLessonIds.map((r: any) => r.lessonId);

    // Get default groups for those lessons
    const defaultLessonGroups = lessonIds.length > 0
      ? await this.groupRepo.find({
          where: { lessonId: In(lessonIds), isDefault: true },
        })
      : [];

    // Get default course groups for courses with engaged lessons
    const courseIds = lessonIds.length > 0
      ? (await this.lessonRepo.query(
          `SELECT DISTINCT course_id FROM lessons WHERE id = ANY($1) AND course_id IS NOT NULL`,
          [lessonIds],
        )).map((r: any) => r.course_id)
      : [];

    const defaultCourseGroups = courseIds.length > 0
      ? await this.groupRepo.find({
          where: { courseId: In(courseIds), lessonId: IsNull(), isDefault: true },
        })
      : [];

    // Merge all and deduplicate (explicit groups carry their status)
    const statusMap = new Map<string, string>(); // groupId -> membershipStatus
    for (const item of explicitGroupsWithStatus) {
      statusMap.set(item.group.id, item.membershipStatus);
    }

    const allGroups = [
      ...explicitGroupsWithStatus.map((item) => item.group),
      ...defaultLessonGroups,
      ...defaultCourseGroups,
    ];
    const seen = new Set<string>();
    const unique = allGroups.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });

    // Enrich with lesson/course titles
    const result = await Promise.all(unique.map(async (g) => {
      let lessonTitle: string | null = null;
      let courseTitle: string | null = null;
      let isCourseGroup = false;

      if (g.courseId && !g.lessonId) {
        isCourseGroup = true;
        const course = await this.courseRepo.findOne({ where: { id: g.courseId } });
        courseTitle = course?.title || 'Unknown Course';
      } else if (g.lessonId) {
        const lesson = await this.lessonRepo.findOne({ where: { id: g.lessonId } });
        lessonTitle = lesson?.title || 'Unknown Lesson';
        if (lesson?.courseId) {
          const course = await this.courseRepo.findOne({ where: { id: lesson.courseId } });
          courseTitle = course?.title || null;
        }
      }

      return {
        id: g.id,
        name: g.name,
        isDefault: g.isDefault,
        isCourseGroup,
        lessonId: g.lessonId,
        courseId: g.courseId,
        parentCourseGroupId: g.parentCourseGroupId,
        lessonTitle,
        courseTitle,
        membershipStatus: statusMap.get(g.id) || 'joined',
      };
    }));

    return result;
  }

  /** Get groups the current user belongs to for a specific lesson */
  async getMyLessonGroups(lessonId: string, userId: string): Promise<any[]> {
    // Check explicit memberships
    const memberships = await this.memberRepo
      .createQueryBuilder('gm')
      .leftJoinAndSelect('gm.group', 'g')
      .where('gm.userId = :userId', { userId })
      .andWhere('gm.status = :status', { status: 'joined' })
      .andWhere('g.lessonId = :lessonId', { lessonId })
      .getMany();

    const explicitGroups = memberships.map((m) => m.group).filter(Boolean);

    // Check if user is an engager (belongs to default group)
    const isEngager = await this.usageRepo.query(
      `SELECT 1 FROM (
        SELECT user_id FROM usages WHERE resource_type = 'lesson' AND resource_id = $1 AND user_id = $2 AND action IN ('view', 'complete')
        UNION
        SELECT user_id FROM user_interaction_progress WHERE lesson_id = $1 AND user_id = $2
      ) combined LIMIT 1`,
      [lessonId, userId],
    );

    const defaultGroups = isEngager.length > 0
      ? await this.groupRepo.find({ where: { lessonId, isDefault: true } })
      : [];

    const allGroups = [...explicitGroups, ...defaultGroups];
    const seen = new Set<string>();
    return allGroups
      .filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        isDefault: g.isDefault,
        isCourseGroup: false,
        lessonId: g.lessonId,
        courseId: g.courseId,
      }));
  }

  /** Get groups the current user belongs to for a specific course */
  async getMyCourseGroups(courseId: string, userId: string): Promise<any[]> {
    // Explicit memberships in course groups
    const memberships = await this.memberRepo
      .createQueryBuilder('gm')
      .leftJoinAndSelect('gm.group', 'g')
      .where('gm.userId = :userId', { userId })
      .andWhere('gm.status = :status', { status: 'joined' })
      .andWhere('g.courseId = :courseId', { courseId })
      .andWhere('g.lessonId IS NULL')
      .getMany();

    const explicitGroups = memberships.map((m) => m.group).filter(Boolean);

    // Check if user is an engager of any lesson in the course
    const lessons = await this.lessonRepo.find({ where: { courseId } });
    if (lessons.length === 0) return explicitGroups.map((g) => ({ id: g.id, name: g.name, isDefault: g.isDefault, isCourseGroup: true, courseId: g.courseId }));

    const lessonIds = lessons.map((l) => l.id);
    const isEngager = await this.usageRepo.query(
      `SELECT 1 FROM (
        SELECT user_id FROM usages WHERE resource_type = 'lesson' AND resource_id = ANY($1) AND user_id = $2 AND action IN ('view', 'complete')
        UNION
        SELECT user_id FROM user_interaction_progress WHERE lesson_id = ANY($1) AND user_id = $2
      ) combined LIMIT 1`,
      [lessonIds.map(String), userId],
    );

    const defaultGroups = isEngager.length > 0
      ? await this.groupRepo.find({ where: { courseId, lessonId: IsNull(), isDefault: true } })
      : [];

    const allGroups = [...explicitGroups, ...defaultGroups];
    const seen = new Set<string>();
    return allGroups
      .filter((g) => {
        if (seen.has(g.id)) return false;
        seen.add(g.id);
        return true;
      })
      .map((g) => ({
        id: g.id,
        name: g.name,
        isDefault: g.isDefault,
        isCourseGroup: true,
        courseId: g.courseId,
      }));
  }

  /** Get course group members — handles default and custom */
  async getCourseGroupMembers(groupId: string, userId: string, searchQuery?: string, userRole?: string): Promise<any[]> {
    const group = await this.assertCanManageGroup(groupId, userId, userRole);
    if (group.isDefault && group.courseId) {
      return this.getDefaultCourseGroupMembers(group.courseId, searchQuery);
    }
    // Custom group — fall through to standard member lookup
    return this.getMembers(groupId, userId, searchQuery, userRole);
  }

  /** Invite members to a group (by email) */
  async inviteMembers(
    groupId: string,
    emails: string[],
    invitedByUserId: string,
    userRole?: string,
  ): Promise<{ invited: number; alreadyMember: number; errors: string[] }> {
    const group = await this.assertCanManageGroup(groupId, invitedByUserId, userRole);
    if (group.isDefault) throw new BadRequestException('Cannot invite members to the default group');

    let invited = 0;
    let alreadyMember = 0;
    const errors: string[] = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        errors.push(`Invalid email: ${rawEmail}`);
        continue;
      }

      // Check if already a member (by email)
      const existingByEmail = await this.memberRepo.findOne({ where: { groupId, email } });
      if (existingByEmail) {
        alreadyMember++;
        continue;
      }

      // Check if user exists
      const user = await this.userRepo.findOne({ where: { email } });

      if (user) {
        // Check if already member by userId
        const existingByUser = await this.memberRepo.findOne({ where: { groupId, userId: user.id } });
        if (existingByUser) {
          alreadyMember++;
          continue;
        }

        const member = this.memberRepo.create({
          groupId,
          userId: user.id,
          email,
          role: 'member',
          status: 'invited',
          invitedBy: invitedByUserId,
          invitedAt: new Date(),
          joinedAt: null,
        });
        await this.memberRepo.save(member);

        // Create in-app notification for the invited user
        await this.createGroupInviteNotification(user.id, group, invitedByUserId);
      } else {
        // User doesn't exist yet — create placeholder membership
        const member = this.memberRepo.create({
          groupId,
          userId: null,
          email,
          role: 'member',
          status: 'invited',
          invitedBy: invitedByUserId,
          invitedAt: new Date(),
          joinedAt: null,
        });
        await this.memberRepo.save(member);
        // No notification for non-existent users; they'll see the invite when they sign up
      }
      invited++;
    }

    return { invited, alreadyMember, errors };
  }

  /** Create a group invite notification and emit via WebSocket */
  private async createGroupInviteNotification(
    recipientUserId: string,
    group: LessonGroup,
    invitedByUserId: string,
  ): Promise<void> {
    try {
      // Resolve the inviter's name/email
      const inviter = await this.userRepo.findOne({ where: { id: invitedByUserId } });
      const inviterName = inviter?.username || inviter?.email?.split('@')[0] || 'Someone';

      // Build context-aware title
      let contextName = group.name;
      if (group.lessonId) {
        const lesson = await this.lessonRepo.findOne({ where: { id: group.lessonId } });
        if (lesson) contextName = `${group.name} (${lesson.title})`;
      } else if (group.courseId) {
        const course = await this.courseRepo.findOne({ where: { id: group.courseId } });
        if (course) contextName = `${group.name} (${course.title})`;
      }

      const notification = this.notificationRepo.create({
        userId: recipientUserId,
        type: NotificationType.GROUP_INVITE,
        title: `Group Invitation`,
        body: `${inviterName} invited you to join "${contextName}".`,
        actionUrl: `/my-lessons?acceptGroup=${group.id}`,
        fromUserId: invitedByUserId,
        toUserId: recipientUserId,
      });
      const saved = await this.notificationRepo.save(notification);
      this.logger.log(`Group invite notification created for user ${recipientUserId}: ${saved.id}`);

      // Emit real-time WebSocket event
      this.chatGateway.emitToUser(recipientUserId, 'new_notification', {
        id: saved.id,
        type: saved.type,
        title: saved.title,
        body: saved.body,
        actionUrl: saved.actionUrl,
        createdAt: saved.createdAt,
      });
    } catch (err) {
      this.logger.warn(`Failed to create group invite notification: ${err}`);
    }
  }

  /** Accept an invitation to a group */
  async acceptInvite(groupId: string, userId: string): Promise<{ success: boolean }> {
    // Find by userId or by email
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let member = await this.memberRepo.findOne({ where: { groupId, userId } });
    if (!member) {
      // Try by email
      member = await this.memberRepo.findOne({ where: { groupId, email: user.email } });
      if (member) {
        member.userId = userId;
      }
    }
    if (!member) throw new NotFoundException('No invitation found');
    if (member.status === 'joined') throw new BadRequestException('Already joined');

    member.status = 'joined';
    member.joinedAt = new Date();
    await this.memberRepo.save(member);
    return { success: true };
  }

  /** Get a single group with enriched info (for group view page) */
  async getGroupDetail(groupId: string, userId: string): Promise<any> {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    let lessonTitle: string | null = null;
    let courseTitle: string | null = null;
    const isCourseGroup = !!group.courseId && !group.lessonId;

    if (group.lessonId) {
      const lesson = await this.lessonRepo.findOne({ where: { id: group.lessonId } });
      lessonTitle = lesson?.title || null;
    }
    if (group.courseId) {
      const course = await this.courseRepo.findOne({ where: { id: group.courseId } });
      courseTitle = course?.title || null;
    }

    return {
      ...group,
      isCourseGroup,
      lessonTitle,
      courseTitle,
    };
  }
}
