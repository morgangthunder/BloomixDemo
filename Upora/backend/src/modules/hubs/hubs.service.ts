import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Hub, HubType, HubStatus } from '../../entities/hub.entity';
import { HubMember, HubMemberRole, HubMemberStatus } from '../../entities/hub-member.entity';
import { HubContentLink, HubContentStatus } from '../../entities/hub-content-link.entity';
import { User } from '../../entities/user.entity';
import { Lesson } from '../../entities/lesson.entity';
import { Course } from '../../entities/course.entity';
import { Notification, NotificationType } from '../../entities/notification.entity';

@Injectable()
export class HubsService implements OnModuleInit {
  private readonly logger = new Logger(HubsService.name);

  constructor(
    @InjectRepository(Hub) private readonly hubRepo: Repository<Hub>,
    @InjectRepository(HubMember) private readonly memberRepo: Repository<HubMember>,
    @InjectRepository(HubContentLink) private readonly contentLinkRepo: Repository<HubContentLink>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      try {
        const tableCheck = await queryRunner.query(
          `SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'hubs')`,
        );
        const exists = tableCheck?.[0]?.exists;
        if (!exists) {
          this.logger.log('Hubs tables not found — creating...');

          await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

          await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS hubs (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              tenant_id UUID NOT NULL,
              name VARCHAR(255) NOT NULL,
              slug VARCHAR(255) NOT NULL UNIQUE,
              description TEXT,
              type VARCHAR(50) NOT NULL DEFAULT 'upora_domain',
              is_public BOOLEAN NOT NULL DEFAULT false,
              logo_url TEXT,
              banner_url TEXT,
              theme_config JSONB,
              db_config JSONB,
              owner_id UUID NOT NULL REFERENCES users(id),
              created_by UUID NOT NULL REFERENCES users(id),
              status VARCHAR(50) NOT NULL DEFAULT 'active',
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_tenant_id ON hubs(tenant_id)`);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_slug ON hubs(slug)`);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hubs_owner_id ON hubs(owner_id)`);

          await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS hub_members (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
              user_id UUID NOT NULL REFERENCES users(id),
              role VARCHAR(50) NOT NULL DEFAULT 'member',
              status VARCHAR(50) NOT NULL DEFAULT 'invited',
              invited_by UUID REFERENCES users(id),
              joined_at TIMESTAMP,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
              UNIQUE(hub_id, user_id)
            )
          `);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_members_hub_id ON hub_members(hub_id)`);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_members_user_id ON hub_members(user_id)`);

          await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS hub_content_links (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
              lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
              course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
              status VARCHAR(50) NOT NULL DEFAULT 'published',
              linked_by UUID NOT NULL REFERENCES users(id),
              released_at TIMESTAMP,
              sort_order INTEGER NOT NULL DEFAULT 0,
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
          `);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_hub_id ON hub_content_links(hub_id)`);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_lesson_id ON hub_content_links(lesson_id)`);
          await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_hub_content_links_course_id ON hub_content_links(course_id)`);
          await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_content_links_hub_lesson
            ON hub_content_links(hub_id, lesson_id) WHERE lesson_id IS NOT NULL
          `);
          await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_content_links_hub_course
            ON hub_content_links(hub_id, course_id) WHERE course_id IS NOT NULL
          `);

          this.logger.log('Hubs tables created successfully');
        } else {
          this.logger.log('Hubs tables already exist');
        }

        // Ensure SSO columns exist (idempotent ALTER)
        await queryRunner.query(`ALTER TABLE hubs ADD COLUMN IF NOT EXISTS auth_config JSONB`);
        await queryRunner.query(`ALTER TABLE hubs ADD COLUMN IF NOT EXISTS shelf_config JSONB`);
        await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(255) DEFAULT 'cognito'`);
        await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider_sub VARCHAR(500)`);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_users_auth_provider_sub
          ON users(auth_provider, auth_provider_sub) WHERE auth_provider_sub IS NOT NULL
        `);
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('Failed to ensure hubs tables:', error);
    }

    // Ensure default hub exists
    await this.ensureDefaultHub();

    // Ensure superadmin accounts are owners of all hubs
    await this.ensureSuperadminHubAccess();
  }

  /**
   * Ensures superadmin accounts are owners of every hub.
   */
  private async ensureSuperadminHubAccess(): Promise<void> {
    const SUPERADMIN_EMAILS = [
      'morganthunder@yahoo.com',
      'morganthunder@gmail.com',
    ];

    try {
      const allHubs = await this.hubRepo.find();
      if (allHubs.length === 0) return;

      for (const email of SUPERADMIN_EMAILS) {
        const user = await this.userRepo.findOne({ where: { email } });
        if (!user) {
          this.logger.warn(`Superadmin user ${email} not found — skipping`);
          continue;
        }

        for (const hub of allHubs) {
          const existing = await this.memberRepo.findOne({
            where: { hubId: hub.id, userId: user.id },
          });
          if (existing) {
            // Upgrade role to owner if not already
            if (existing.role !== HubMemberRole.OWNER) {
              existing.role = HubMemberRole.OWNER;
              existing.status = HubMemberStatus.JOINED;
              existing.joinedAt = existing.joinedAt || new Date();
              await this.memberRepo.save(existing);
              this.logger.log(`Upgraded ${email} to owner on hub "${hub.slug}"`);
            }
          } else {
            const member = this.memberRepo.create({
              hubId: hub.id,
              userId: user.id,
              role: HubMemberRole.OWNER,
              status: HubMemberStatus.JOINED,
              joinedAt: new Date(),
            });
            await this.memberRepo.save(member);
            this.logger.log(`Added ${email} as owner of hub "${hub.slug}"`);
          }
        }
      }
    } catch (error: any) {
      this.logger.warn('Could not ensure superadmin hub access:', error.message);
    }
  }

  /**
   * Creates the 'default' system hub if it doesn't exist.
   * This hub backs the main homepage (/) and can be managed like any hub.
   */
  private async ensureDefaultHub(): Promise<void> {
    try {
      const existing = await this.hubRepo.findOne({ where: { slug: 'default' } });
      if (existing) {
        this.logger.log('Default hub already exists: ' + existing.id);
        return;
      }

      // Find the first admin user to be owner, or fall back to any user
      let superAdmin = await this.userRepo
        .createQueryBuilder('u')
        .where("u.role = 'admin'")
        .orderBy('u.created_at', 'ASC')
        .getOne();

      if (!superAdmin) {
        // Fall back to any user if no admin exists
        superAdmin = await this.userRepo
          .createQueryBuilder('u')
          .orderBy('u.created_at', 'ASC')
          .getOne();
      }

      if (!superAdmin) {
        this.logger.warn('No user found — cannot create default hub yet');
        return;
      }

      const defaultHub = this.hubRepo.create({
        tenantId: superAdmin.tenantId,
        name: 'Upora',
        slug: 'default',
        description: 'The default Upora content hub',
        type: HubType.UPORA_DOMAIN,
        isPublic: true,
        status: HubStatus.ACTIVE,
        ownerId: superAdmin.id,
        createdBy: superAdmin.id,
        shelfConfig: {
          shelves: [
            { id: 'featured', type: 'featured', label: 'Featured', enabled: true, sortOrder: 0 },
            { id: 'continue-learning', type: 'continue_learning', label: 'Continue Learning', enabled: true, sortOrder: 1 },
            { id: 'courses-shelf', type: 'courses', label: 'Courses', enabled: true, sortOrder: 2, config: {} },
            { id: 'recommended', type: 'recommended', label: 'Recommended For You', enabled: true, sortOrder: 3 },
          ],
        },
      });
      const saved = await this.hubRepo.save(defaultHub);

      // Add owner as member
      const member = this.memberRepo.create({
        hubId: saved.id,
        userId: superAdmin.id,
        role: HubMemberRole.OWNER,
        status: HubMemberStatus.JOINED,
        joinedAt: new Date(),
      });
      await this.memberRepo.save(member);

      this.logger.log(`Default hub created: ${saved.id} (slug: default)`);
    } catch (error: any) {
      this.logger.warn('Could not create default hub:', error.message);
    }
  }

  // ═══════════════════════════════════
  // HUB CRUD
  // ═══════════════════════════════════

  async createHub(data: {
    name: string;
    slug: string;
    description?: string;
    type: HubType;
    isPublic?: boolean;
    logoUrl?: string;
    bannerUrl?: string;
  }, userId: string, tenantId: string): Promise<Hub> {
    // Validate slug format
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (!slugRegex.test(data.slug) || data.slug.length < 3) {
      throw new BadRequestException('Slug must be at least 3 characters, lowercase alphanumeric with hyphens');
    }

    // Prevent dedicated_db creation for now
    if (data.type === HubType.DEDICATED_DB) {
      throw new BadRequestException('Dedicated database hubs are not yet available');
    }

    // Check slug uniqueness
    const existing = await this.hubRepo.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException(`Hub with slug "${data.slug}" already exists`);
    }

    const hub = this.hubRepo.create({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      type: data.type,
      isPublic: data.isPublic || false,
      logoUrl: data.logoUrl || null,
      bannerUrl: data.bannerUrl || null,
      ownerId: userId,
      createdBy: userId,
      tenantId,
      status: HubStatus.ACTIVE,
    });

    const savedHub = await this.hubRepo.save(hub);

    // Auto-add creator as owner member
    const ownerMember = this.memberRepo.create({
      hubId: savedHub.id,
      userId,
      role: HubMemberRole.OWNER,
      status: HubMemberStatus.JOINED,
      joinedAt: new Date(),
    });
    await this.memberRepo.save(ownerMember);

    this.logger.log(`Hub created: ${savedHub.name} (${savedHub.slug}) by ${userId}`);
    return savedHub;
  }

  async getMyHubs(userId: string): Promise<any[]> {
    const memberships = await this.memberRepo.find({
      where: { userId, status: In([HubMemberStatus.JOINED, HubMemberStatus.INVITED]) },
      relations: ['hub'],
    });

    return memberships.map(m => ({
      id: m.hub.id,
      name: m.hub.name,
      slug: m.hub.slug,
      description: m.hub.description,
      type: m.hub.type,
      isPublic: m.hub.isPublic,
      logoUrl: m.hub.logoUrl,
      bannerUrl: m.hub.bannerUrl,
      status: m.hub.status,
      myRole: m.role,
      myStatus: m.status,
      createdAt: m.hub.createdAt,
    }));
  }

  async getHubBySlug(slug: string, userId?: string): Promise<any> {
    const hub = await this.hubRepo.findOne({ where: { slug, status: HubStatus.ACTIVE } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);

    // Check membership
    let membership: HubMember | null = null;
    if (userId) {
      membership = await this.memberRepo.findOne({
        where: { hubId: hub.id, userId },
      });
    }

    // Non-public hubs require membership — but SSO hubs show the login page instead of 403
    const isOidcHub = (hub.authConfig as any)?.provider === 'oidc';
    if (!hub.isPublic && (!membership || membership.status !== HubMemberStatus.JOINED)) {
      if (!isOidcHub) {
        throw new ForbiddenException('You do not have access to this hub');
      }
      // For SSO hubs: allow viewing basic hub info so they can see the SSO login button
    }

    // Get counts
    const memberCount = await this.memberRepo.count({
      where: { hubId: hub.id, status: HubMemberStatus.JOINED },
    });
    const contentCount = await this.contentLinkRepo.count({
      where: { hubId: hub.id, status: HubContentStatus.PUBLISHED },
    });

    return {
      ...hub,
      memberCount,
      contentCount,
      myRole: membership?.role || null,
      myStatus: membership?.status || null,
      authProvider: (hub.authConfig as any)?.provider || 'upora',
      ssoEnabled: (hub.authConfig as any)?.provider === 'oidc',
    };
  }

  async getHubById(hubId: string): Promise<Hub> {
    const hub = await this.hubRepo.findOne({ where: { id: hubId } });
    if (!hub) throw new NotFoundException('Hub not found');
    return hub;
  }

  async updateHub(hubId: string, data: Partial<{
    name: string;
    description: string;
    isPublic: boolean;
    logoUrl: string;
    bannerUrl: string;
    themeConfig: Record<string, any>;
  }>, userId: string): Promise<Hub> {
    await this.assertHubAdmin(hubId, userId);
    const hub = await this.getHubById(hubId);
    Object.assign(hub, data);
    return this.hubRepo.save(hub);
  }

  async updateAuthConfig(hubId: string, config: Record<string, any>, userId: string): Promise<Hub> {
    await this.assertHubAdmin(hubId, userId);
    const hub = await this.getHubById(hubId);

    // Validate provider
    if (config.provider && !['upora', 'oidc'].includes(config.provider)) {
      throw new BadRequestException('Invalid auth provider. Use "upora" or "oidc".');
    }

    const existingConfig = (hub.authConfig as any) || {};
    hub.authConfig = {
      provider: config.provider || 'upora',
      oidcIssuerUrl: config.oidcIssuerUrl || null,
      oidcClientId: config.oidcClientId || null,
      // Preserve existing secret if not provided in update
      oidcClientSecret: config.oidcClientSecret || existingConfig.oidcClientSecret || null,
      emailClaim: config.emailClaim || 'email',
      nameClaim: config.nameClaim || 'name',
      scopes: config.scopes || 'openid email profile',
    };

    this.logger.log(`Hub ${hub.slug} auth config updated to: ${config.provider}`);
    return this.hubRepo.save(hub);
  }

  async getAuthConfig(hubId: string, userId: string): Promise<any> {
    await this.assertHubAdmin(hubId, userId);
    const hub = await this.getHubById(hubId);
    const config = hub.authConfig || { provider: 'upora' };
    // Mask the client secret
    return {
      ...config,
      oidcClientSecret: config.oidcClientSecret ? '••••••••' : null,
    };
  }

  // ═══════════════════════════════════
  // SHELF CONFIG
  // ═══════════════════════════════════

  async getShelfConfig(hubId: string): Promise<any> {
    const hub = await this.getHubById(hubId);
    return hub.shelfConfig || { shelves: [] };
  }

  async getShelfConfigBySlug(slug: string): Promise<any> {
    const hub = await this.hubRepo.findOne({ where: { slug } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);
    return hub.shelfConfig || { shelves: [] };
  }

  async updateShelfConfig(hubId: string, shelfConfig: any, userId: string): Promise<any> {
    await this.assertHubAdmin(hubId, userId);
    const hub = await this.getHubById(hubId);
    hub.shelfConfig = shelfConfig;
    await this.hubRepo.save(hub);
    this.logger.log(`Shelf config updated for hub ${hub.slug}`);
    return hub.shelfConfig;
  }

  /**
   * Returns resolved shelf data for rendering (populated with actual lessons/courses).
   * For user-specific shelves (continue_learning, recommended), uses the requesting user's context.
   */
  async getResolvedShelvesData(slug: string, userId: string): Promise<any[]> {
    const hub = await this.hubRepo.findOne({ where: { slug } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);

    const config = hub.shelfConfig as any;
    const shelves = (config?.shelves || [])
      .filter((s: any) => s.enabled !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const results: any[] = [];
    for (const shelf of shelves) {
      const data = await this.resolveShelfData(shelf, hub, userId);
      results.push({ ...shelf, data });
    }
    return results;
  }

  private async resolveShelfData(shelf: any, hub: Hub, userId: string): Promise<any[]> {
    try {
      switch (shelf.type) {
        case 'featured':
          return this.resolveFeaturedShelf(hub, shelf.config, userId);
        case 'continue_learning':
          return this.resolveContinueLearningShelf(userId);
        case 'recommended':
          return this.resolveRecommendedShelf(userId);
        case 'courses':
          return this.resolveCoursesShelf(hub, shelf.config);
        case 'category':
          return this.resolveCategoryShelf(hub, shelf.config);
        case 'custom':
          return this.resolveCustomShelf(shelf.config);
        default:
          return [];
      }
    } catch (e: any) {
      this.logger.warn(`Failed to resolve shelf "${shelf.id}": ${e.message}`);
      return [];
    }
  }

  private async resolveFeaturedShelf(hub: Hub, config: any, userId: string): Promise<any[]> {
    const mode = config?.mode || 'auto';

    // Mode: specific — return a specific pinned lesson
    if (mode === 'specific' && config?.lessonId) {
      const lessons = await this.dataSource.query(`
        SELECT id, title, description, thumbnail_url, category, difficulty, rating_average, course_id, required_subscription_tier
        FROM lessons WHERE id = $1 AND status = 'approved' LIMIT 1
      `, [config.lessonId]);
      if (lessons.length > 0) {
        return lessons.map((l: any) => ({
          id: l.id, title: l.title, description: l.description,
          thumbnailUrl: l.thumbnail_url, category: l.category,
          difficulty: l.difficulty, ratingAverage: l.rating_average,
          courseId: l.course_id, requiredSubscriptionTier: l.required_subscription_tier,
        }));
      }
    }

    // Mode: auto — most popular lesson matching user's learning areas
    if (userId) {
      try {
        const personalization = await this.dataSource.query(
          `SELECT learning_areas FROM user_personalization WHERE user_id = $1`, [userId],
        );
        const areas: string[] = personalization?.[0]?.learning_areas || [];
        if (areas.length > 0) {
          const conditions = areas.map((_, i) => `(LOWER(l.category) LIKE '%' || LOWER($${i + 1}) || '%' OR LOWER(l.tags::text) LIKE '%' || LOWER($${i + 1}) || '%')`);
          const rows = await this.dataSource.query(`
            SELECT l.id, l.title, l.description, l.thumbnail_url, l.category, l.difficulty, l.rating_average, l.course_id, l.required_subscription_tier,
                   COUNT(t.id) AS engagement_count
            FROM lessons l
            LEFT JOIN lesson_engagement_transcriptions t ON t.lesson_id = l.id
            WHERE l.status = 'approved' AND (${conditions.join(' OR ')})
            GROUP BY l.id
            ORDER BY engagement_count DESC, l.rating_average DESC NULLS LAST
            LIMIT 1
          `, areas);
          if (rows.length > 0) {
            return rows.map((l: any) => ({
              id: l.id, title: l.title, description: l.description,
              thumbnailUrl: l.thumbnail_url, category: l.category,
              difficulty: l.difficulty, ratingAverage: l.rating_average,
              courseId: l.course_id, requiredSubscriptionTier: l.required_subscription_tier,
            }));
          }
        }
      } catch { /* fall through to default */ }
    }

    // Fallback: highest-rated approved lesson
    const lessons = await this.dataSource.query(`
      SELECT id, title, description, thumbnail_url, category, difficulty, rating_average, course_id, required_subscription_tier
      FROM lessons WHERE status = 'approved'
      ORDER BY rating_average DESC NULLS LAST, created_at DESC LIMIT 1
    `);
    return lessons.map((l: any) => ({
      id: l.id, title: l.title, description: l.description,
      thumbnailUrl: l.thumbnail_url, category: l.category,
      difficulty: l.difficulty, ratingAverage: l.rating_average,
      courseId: l.course_id, requiredSubscriptionTier: l.required_subscription_tier,
    }));
  }

  private async resolveContinueLearningShelf(userId: string): Promise<any[]> {
    // Last 10 lessons the user engaged with
    const rows = await this.dataSource.query(`
      SELECT DISTINCT ON (l.id) l.id, l.title, l.description, l.thumbnail_url, l.category, l.course_id, l.required_subscription_tier, t.updated_at AS last_engaged
      FROM lesson_engagement_transcriptions t
      JOIN lessons l ON l.id = t.lesson_id
      WHERE t.user_id = $1 AND l.status = 'approved'
      ORDER BY l.id, t.updated_at DESC
    `, [userId]);
    // Sort by most recent engagement
    rows.sort((a: any, b: any) => new Date(b.last_engaged).getTime() - new Date(a.last_engaged).getTime());
    return rows.slice(0, 10).map((l: any) => ({
      id: l.id, title: l.title, description: l.description,
      thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
      requiredSubscriptionTier: l.required_subscription_tier,
    }));
  }

  private async resolveRecommendedShelf(userId: string): Promise<any[]> {
    // Simple: match lessons against user's learning_areas from user_personalization
    try {
      const personalization = await this.dataSource.query(
        `SELECT learning_areas FROM user_personalization WHERE user_id = $1`, [userId],
      );
      const areas: string[] = personalization?.[0]?.learning_areas || [];
      if (areas.length === 0) {
        // Fallback: top 10 most engaged-with lessons (by total engagement count)
        const fallback = await this.dataSource.query(`
          SELECT l.id, l.title, l.description, l.thumbnail_url, l.category, l.course_id, l.required_subscription_tier,
                 COUNT(t.id) AS engagement_count
          FROM lessons l
          LEFT JOIN lesson_engagement_transcriptions t ON t.lesson_id = l.id
          WHERE l.status = 'approved'
          GROUP BY l.id
          ORDER BY engagement_count DESC, l.created_at DESC
          LIMIT 10
        `);
        return fallback.map((l: any) => ({
          id: l.id, title: l.title, description: l.description,
          thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
          requiredSubscriptionTier: l.required_subscription_tier,
        }));
      }
      // Match by category or tags containing any of the learning areas
      const likeConditions = areas.map((_, i) => `(LOWER(l.category) LIKE '%' || LOWER($${i + 1}) || '%' OR LOWER(l.tags::text) LIKE '%' || LOWER($${i + 1}) || '%')`).join(' OR ');
      const recommended = await this.dataSource.query(`
        SELECT id, title, description, thumbnail_url, category, course_id, required_subscription_tier
        FROM lessons l WHERE status = 'approved' AND (${likeConditions})
        ORDER BY rating_average DESC NULLS LAST, created_at DESC LIMIT 10
      `, areas);
      const results = recommended.map((l: any) => ({
        id: l.id, title: l.title, description: l.description,
        thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
        requiredSubscriptionTier: l.required_subscription_tier,
      }));

      // If fewer than 10 matches, fill remaining slots with top-engaged lessons
      if (results.length < 10) {
        const existingIds = results.map((r: any) => r.id);
        const remaining = 10 - results.length;
        const excludePlaceholders = existingIds.length > 0
          ? `AND l.id NOT IN (${existingIds.map((_: any, i: number) => `$${i + 1}`).join(', ')})`
          : '';
        const filler = await this.dataSource.query(`
          SELECT l.id, l.title, l.description, l.thumbnail_url, l.category, l.course_id, l.required_subscription_tier,
                 COUNT(t.id) AS engagement_count
          FROM lessons l
          LEFT JOIN lesson_engagement_transcriptions t ON t.lesson_id = l.id
          WHERE l.status = 'approved' ${excludePlaceholders}
          GROUP BY l.id
          ORDER BY engagement_count DESC, l.created_at DESC
          LIMIT ${remaining}
        `, existingIds);
        for (const l of filler) {
          results.push({
            id: l.id, title: l.title, description: l.description,
            thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
            requiredSubscriptionTier: l.required_subscription_tier,
          });
        }
      }
      return results;
    } catch {
      // Table might not exist yet — fall back to most engaged lessons
      try {
        const fallback = await this.dataSource.query(`
          SELECT l.id, l.title, l.description, l.thumbnail_url, l.category, l.course_id, l.required_subscription_tier,
                 COUNT(t.id) AS engagement_count
          FROM lessons l
          LEFT JOIN lesson_engagement_transcriptions t ON t.lesson_id = l.id
          WHERE l.status = 'approved'
          GROUP BY l.id
          ORDER BY engagement_count DESC, l.created_at DESC
          LIMIT 10
        `);
        return fallback.map((l: any) => ({
          id: l.id, title: l.title, description: l.description,
          thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
          requiredSubscriptionTier: l.required_subscription_tier,
        }));
      } catch {
        return [];
      }
    }
  }

  private async resolveCoursesShelf(hub: Hub, config?: any): Promise<any[]> {
    let courses: any[];
    if (config?.courseIds?.length > 0) {
      const placeholders = config.courseIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
      courses = await this.dataSource.query(`
        SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
        FROM courses c WHERE c.id IN (${placeholders}) AND c.status IN ('approved', 'published')
        ORDER BY c.title
      `, config.courseIds);
    } else {
      courses = await this.dataSource.query(`
        SELECT c.*, (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
        FROM courses c WHERE c.status IN ('approved', 'published')
        ORDER BY c.created_at DESC LIMIT 20
      `);
    }
    return courses.map((c: any) => ({
      id: c.id, title: c.title, description: c.description,
      thumbnailUrl: c.thumbnail_url, lessonCount: parseInt(c.lesson_count, 10) || 0,
      status: c.status,
    }));
  }

  private async resolveCategoryShelf(hub: Hub, config?: any): Promise<any[]> {
    const category = config?.category;
    if (!category) return [];

    // Support multiple categories/learning areas (comma-separated)
    const categories = category.split(',').map((c: string) => c.trim().toLowerCase()).filter((c: string) => c);
    if (categories.length === 0) return [];

    let lessons: any[];
    if (categories.length === 1) {
      lessons = await this.dataSource.query(`
        SELECT id, title, description, thumbnail_url, category, course_id, required_subscription_tier
        FROM lessons WHERE status = 'approved'
        AND (LOWER(category) LIKE '%' || $1 || '%' OR LOWER(tags::text) LIKE '%' || $1 || '%')
        ORDER BY created_at DESC LIMIT 10
      `, [categories[0]]);
    } else {
      const conditions = categories.map((_: string, i: number) =>
        `(LOWER(category) LIKE '%' || $${i + 1} || '%' OR LOWER(tags::text) LIKE '%' || $${i + 1} || '%')`
      );
      lessons = await this.dataSource.query(`
        SELECT id, title, description, thumbnail_url, category, course_id, required_subscription_tier
        FROM lessons WHERE status = 'approved'
        AND (${conditions.join(' OR ')})
        ORDER BY created_at DESC LIMIT 10
      `, categories);
    }
    return lessons.map((l: any) => ({
      id: l.id, title: l.title, description: l.description,
      thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
      requiredSubscriptionTier: l.required_subscription_tier,
    }));
  }

  private async resolveCustomShelf(config?: any): Promise<any[]> {
    const lessonIds = config?.lessonIds;
    if (!lessonIds || lessonIds.length === 0) return [];
    const placeholders = lessonIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
    const lessons = await this.dataSource.query(`
      SELECT id, title, description, thumbnail_url, category, course_id, required_subscription_tier
      FROM lessons WHERE status = 'approved' AND id IN (${placeholders})
    `, lessonIds);
    // Preserve the order from config
    const orderMap = new Map<string, number>(lessonIds.map((id: string, i: number) => [id, i]));
    lessons.sort((a: any, b: any) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
    return lessons.map((l: any) => ({
      id: l.id, title: l.title, description: l.description,
      thumbnailUrl: l.thumbnail_url, category: l.category, courseId: l.course_id,
      requiredSubscriptionTier: l.required_subscription_tier,
    }));
  }

  async archiveHub(hubId: string, userId: string): Promise<void> {
    const hub = await this.getHubById(hubId);
    if (hub.ownerId !== userId) {
      throw new ForbiddenException('Only the hub owner can archive it');
    }
    hub.status = HubStatus.ARCHIVED;
    await this.hubRepo.save(hub);
  }

  // ═══════════════════════════════════
  // MEMBERS
  // ═══════════════════════════════════

  async getMembers(hubId: string, userId: string, search?: string): Promise<any[]> {
    await this.assertHubMember(hubId, userId);

    let query = this.memberRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.hub_id = :hubId', { hubId })
      .andWhere('m.status != :removed', { removed: HubMemberStatus.REMOVED });

    if (search) {
      query = query.andWhere(
        '(u.email ILIKE :search OR u.username ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const members = await query.orderBy('m.created_at', 'ASC').getMany();
    return members.map(m => ({
      id: m.userId,
      name: m.user?.username || m.user?.email || 'Unknown',
      email: m.user?.email || '',
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
    }));
  }

  async inviteMembers(hubId: string, emails: string[], invitedByUserId: string): Promise<{
    invited: number; alreadyMember: number; errors: string[];
  }> {
    await this.assertHubAdmin(hubId, invitedByUserId);
    const hub = await this.getHubById(hubId);

    // Block invitations for SSO hubs — members join via SSO login only
    const authConfig = hub.authConfig as any;
    if (authConfig?.provider === 'oidc') {
      throw new BadRequestException(
        'This hub uses external SSO. Members join automatically when they authenticate through the SSO provider. Manual invitations are disabled.',
      );
    }

    let invited = 0;
    let alreadyMember = 0;
    const errors: string[] = [];

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) continue;

      try {
        // Check if already a member
        const user = await this.userRepo.findOne({ where: { email: trimmed } });
        if (user) {
          const existing = await this.memberRepo.findOne({
            where: { hubId, userId: user.id },
          });
          if (existing && existing.status !== HubMemberStatus.REMOVED) {
            alreadyMember++;
            continue;
          }

          if (existing && existing.status === HubMemberStatus.REMOVED) {
            // Re-invite removed member
            existing.status = HubMemberStatus.INVITED;
            existing.invitedBy = invitedByUserId;
            await this.memberRepo.save(existing);
          } else {
            const member = this.memberRepo.create({
              hubId,
              userId: user.id,
              role: HubMemberRole.MEMBER,
              status: HubMemberStatus.INVITED,
              invitedBy: invitedByUserId,
            });
            await this.memberRepo.save(member);
          }

          // Send notification
          await this.createHubInviteNotification(user.id, hub, invitedByUserId);
          invited++;
        } else {
          errors.push(`${trimmed}: user not found`);
        }
      } catch (err) {
        errors.push(`${trimmed}: ${err.message}`);
      }
    }

    return { invited, alreadyMember, errors };
  }

  async acceptInvite(hubId: string, userId: string): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { hubId, userId, status: HubMemberStatus.INVITED },
    });
    if (!member) throw new NotFoundException('No pending invite found');

    member.status = HubMemberStatus.JOINED;
    member.joinedAt = new Date();
    await this.memberRepo.save(member);
  }

  async changeMemberRole(hubId: string, targetUserId: string, newRole: HubMemberRole, requestingUserId: string): Promise<void> {
    await this.assertHubAdmin(hubId, requestingUserId);
    const member = await this.memberRepo.findOne({
      where: { hubId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === HubMemberRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role');
    }
    member.role = newRole;
    await this.memberRepo.save(member);
  }

  async removeMember(hubId: string, targetUserId: string, requestingUserId: string): Promise<void> {
    await this.assertHubAdmin(hubId, requestingUserId);
    const member = await this.memberRepo.findOne({
      where: { hubId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === HubMemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove the hub owner');
    }
    member.status = HubMemberStatus.REMOVED;
    await this.memberRepo.save(member);
  }

  // ═══════════════════════════════════
  // CONTENT LINKS
  // ═══════════════════════════════════

  async getHubContent(hubId: string, userId?: string): Promise<any> {
    const links = await this.contentLinkRepo.find({
      where: { hubId, status: HubContentStatus.PUBLISHED },
      relations: ['lesson', 'course'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const lessons = links.filter(l => l.lessonId).map(l => ({
      linkId: l.id,
      id: l.lesson?.id,
      title: l.lesson?.title,
      description: l.lesson?.description,
      thumbnailUrl: (l.lesson as any)?.thumbnailUrl,
      category: (l.lesson as any)?.category,
      difficulty: (l.lesson as any)?.difficulty,
      status: (l.lesson as any)?.status,
      sortOrder: l.sortOrder,
    }));

    const courses = links.filter(l => l.courseId).map(l => ({
      linkId: l.id,
      id: l.course?.id,
      title: l.course?.title,
      description: l.course?.description,
      status: l.course?.status,
      sortOrder: l.sortOrder,
      lessons: l.course?.lessons || [],
    }));

    return { lessons, courses };
  }

  async linkContent(hubId: string, data: {
    lessonId?: string;
    courseId?: string;
  }, userId: string): Promise<HubContentLink> {
    await this.assertHubAdminOrContentCreator(hubId, userId, data.lessonId, data.courseId);

    if (!data.lessonId && !data.courseId) {
      throw new BadRequestException('Must provide lessonId or courseId');
    }

    // Check for duplicate
    const where: any = { hubId };
    if (data.lessonId) where.lessonId = data.lessonId;
    if (data.courseId) where.courseId = data.courseId;
    const existing = await this.contentLinkRepo.findOne({ where });
    if (existing && existing.status !== HubContentStatus.REMOVED) {
      throw new ConflictException('This content is already linked to this hub');
    }

    if (existing) {
      existing.status = HubContentStatus.PUBLISHED;
      existing.linkedBy = userId;
      return this.contentLinkRepo.save(existing);
    }

    const link = this.contentLinkRepo.create({
      hubId,
      lessonId: data.lessonId || null,
      courseId: data.courseId || null,
      linkedBy: userId,
      status: HubContentStatus.PUBLISHED,
    });
    return this.contentLinkRepo.save(link);
  }

  async unlinkContent(hubId: string, linkId: string, userId: string): Promise<void> {
    await this.assertHubAdmin(hubId, userId);
    const link = await this.contentLinkRepo.findOne({ where: { id: linkId, hubId } });
    if (!link) throw new NotFoundException('Content link not found');
    link.status = HubContentStatus.REMOVED;
    await this.contentLinkRepo.save(link);
  }

  async publishToHubs(
    hubIds: string[],
    lessonId: string | null,
    courseId: string | null,
    userId: string,
  ): Promise<{ linked: number; errors: string[] }> {
    let linked = 0;
    const errors: string[] = [];

    for (const hubId of hubIds) {
      try {
        await this.linkContent(hubId, { lessonId: lessonId || undefined, courseId: courseId || undefined }, userId);
        linked++;
      } catch (err) {
        this.logger.error(`[publishToHubs] Failed to link to hub ${hubId}: ${err.message}`, err.stack);
        errors.push(`Hub ${hubId}: ${err.message}`);
      }
    }

    return { linked, errors };
  }

  // ═══════════════════════════════════
  // HUB CONTENT FOR DISPLAY (by slug)
  // ═══════════════════════════════════

  async getHubLessons(slug: string): Promise<any[]> {
    const hub = await this.hubRepo.findOne({ where: { slug, status: HubStatus.ACTIVE } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);

    const links = await this.contentLinkRepo.find({
      where: { hubId: hub.id, status: HubContentStatus.PUBLISHED },
      relations: ['lesson'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return links
      .filter(l => l.lessonId && l.lesson)
      .map(l => ({
        id: l.lesson.id,
        title: l.lesson.title,
        description: l.lesson.description,
        thumbnailUrl: (l.lesson as any).thumbnailUrl,
        category: (l.lesson as any).category,
        difficulty: (l.lesson as any).difficulty,
        status: (l.lesson as any).status,
      }));
  }

  async getHubCourses(slug: string): Promise<any[]> {
    const hub = await this.hubRepo.findOne({ where: { slug, status: HubStatus.ACTIVE } });
    if (!hub) throw new NotFoundException(`Hub "${slug}" not found`);

    const links = await this.contentLinkRepo.find({
      where: { hubId: hub.id, status: HubContentStatus.PUBLISHED },
      relations: ['course', 'course.lessons'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return links
      .filter(l => l.courseId && l.course)
      .map(l => ({
        id: l.course.id,
        title: l.course.title,
        description: l.course.description,
        status: l.course.status,
        lessons: l.course.lessons || [],
      }));
  }

  // ═══════════════════════════════════
  // ACCESS CONTROL HELPERS
  // ═══════════════════════════════════

  private async assertHubMember(hubId: string, userId: string): Promise<HubMember> {
    const member = await this.memberRepo.findOne({
      where: { hubId, userId, status: HubMemberStatus.JOINED },
    });
    if (!member) throw new ForbiddenException('You are not a member of this hub');
    return member;
  }

  private async assertHubAdmin(hubId: string, userId: string): Promise<HubMember> {
    const member = await this.memberRepo.findOne({
      where: { hubId, userId, status: HubMemberStatus.JOINED },
    });
    if (!member) throw new ForbiddenException('You are not a member of this hub');
    if (member.role !== HubMemberRole.OWNER && member.role !== HubMemberRole.ADMIN) {
      throw new ForbiddenException('Hub admin access required');
    }
    return member;
  }

  private async assertHubAdminOrContentCreator(
    hubId: string, userId: string, lessonId?: string, courseId?: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: { hubId, userId, status: HubMemberStatus.JOINED },
    });
    if (!member) throw new ForbiddenException('You are not a member of this hub');

    // Admins/owners can always link
    if (member.role === HubMemberRole.OWNER || member.role === HubMemberRole.ADMIN) return;

    // Content creators can link their own content
    if (lessonId) {
      const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
      if (lesson && lesson.createdBy === userId) return;
    }
    if (courseId) {
      const course = await this.courseRepo.findOne({ where: { id: courseId } });
      if (course && course.createdBy === userId) return;
    }

    throw new ForbiddenException('You can only add your own content to this hub');
  }

  // ═══════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════

  private async createHubInviteNotification(
    recipientUserId: string, hub: Hub, invitedByUserId: string,
  ): Promise<void> {
    const inviter = await this.userRepo.findOne({ where: { id: invitedByUserId } });
    const inviterName = inviter?.username || inviter?.email || 'Someone';

    const notification = this.notificationRepo.create({
      userId: recipientUserId,
      toUserId: recipientUserId,
      fromUserId: invitedByUserId,
      hubId: hub.id,
      type: NotificationType.HUB_INVITE,
      title: `Hub Invitation: ${hub.name}`,
      body: `${inviterName} invited you to join the hub "${hub.name}".`,
      actionUrl: `/hubs/${hub.slug}?acceptHub=${hub.id}`,
    });
    await this.notificationRepo.save(notification);
  }
}
