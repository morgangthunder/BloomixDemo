import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { PersonalizationOption } from '../../entities/personalization-option.entity';
import { UpdateUserPersonalizationDto } from './dto/update-user-personalization.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserPersonalizationService implements OnModuleInit {
  constructor(
    @InjectRepository(UserPersonalization)
    private personalizationRepo: Repository<UserPersonalization>,
    @InjectRepository(PersonalizationOption)
    private optionsRepo: Repository<PersonalizationOption>,
    private usersService: UsersService,
  ) {}

  private async ensureUser(userId: string, opts?: { email?: string; tenantId?: string }) {
    await this.usersService.ensureUserExists(userId, opts);
  }

  /** One-time backfill: ensure all user_ids exist; seed default options if empty. */
  async onModuleInit() {
    try {
      const all = await this.personalizationRepo.find({ select: ['userId'] });
      const userIds = [...new Set(all.map((p) => p.userId).filter(Boolean))];
      for (const uid of userIds) {
        await this.usersService.ensureUserExists(uid);
      }
      if (userIds.length > 0) {
        console.log(`[UserPersonalization] Backfilled ${userIds.length} users from personalization`);
      }
    } catch (err) {
      console.warn('[UserPersonalization] Backfill warning:', (err as Error)?.message);
    }
    await this.seedDefaultOptions();
  }

  /** Seed default tv_movies and hobbies options if none exist. */
  private async seedDefaultOptions(): Promise<void> {
    const defaults: { category: string; options: { id: string; label: string }[] }[] = [
      {
        category: 'tv_movies',
        options: [
          { id: 'action', label: 'Action & Adventure' },
          { id: 'comedy', label: 'Comedy' },
          { id: 'drama', label: 'Drama' },
          { id: 'sci_fi', label: 'Sci-Fi & Fantasy' },
          { id: 'documentary', label: 'Documentary' },
          { id: 'horror', label: 'Horror' },
          { id: 'romance', label: 'Romance' },
          { id: 'animation', label: 'Animation' },
          { id: 'thriller', label: 'Thriller' },
          { id: 'kids', label: 'Kids & Family' },
        ],
      },
      {
        category: 'hobbies',
        options: [
          { id: 'reading', label: 'Reading' },
          { id: 'gaming', label: 'Gaming' },
          { id: 'sports', label: 'Sports & Fitness' },
          { id: 'music', label: 'Music' },
          { id: 'art', label: 'Art & Creativity' },
          { id: 'cooking', label: 'Cooking' },
          { id: 'travel', label: 'Travel' },
          { id: 'photography', label: 'Photography' },
          { id: 'crafts', label: 'Crafts & DIY' },
          { id: 'nature', label: 'Nature & Outdoors' },
        ],
      },
    ];
    for (const { category, options } of defaults) {
      const existing = await this.optionsRepo.findOne({
        where: { category, ageRange: '', gender: '' },
      });
      if (!existing) {
        await this.optionsRepo.save(
          this.optionsRepo.create({ category, ageRange: '', gender: '', options }),
        );
        console.log(`[UserPersonalization] Seeded default options for category: ${category}`);
      }
    }
  }

  /**
   * Get current user's personalization. Creates empty row if none exists.
   */
  async getMine(
    userId: string,
    opts?: { email?: string; tenantId?: string },
  ): Promise<UserPersonalization> {
    const uid = userId?.trim() || '';
    if (!uid) {
      throw new NotFoundException('User ID is required. Ensure x-user-id header is set.');
    }
    try {
      await this.ensureUser(uid, opts);
    } catch (err) {
      console.warn('[UserPersonalization] ensureUser failed:', (err as Error)?.message);
      // Continue - user might already exist, or we can still create personalization
    }
    let prefs = await this.personalizationRepo.findOne({ where: { userId: uid } });
    if (!prefs) {
      prefs = this.personalizationRepo.create({
        userId: uid,
        favouriteTvMovies: [],
        hobbiesInterests: [],
        learningAreas: [],
      });
      await this.personalizationRepo.save(prefs);
    }
    return prefs;
  }

  /**
   * Update current user's personalization.
   */
  async updateMine(
    userId: string,
    dto: UpdateUserPersonalizationDto,
    opts?: { email?: string; tenantId?: string },
  ): Promise<UserPersonalization> {
    await this.ensureUser(userId, opts);
    let prefs = await this.personalizationRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.personalizationRepo.create({
        userId,
        favouriteTvMovies: [],
        hobbiesInterests: [],
        learningAreas: [],
      });
    }

    if (dto.fullName !== undefined) prefs.fullName = dto.fullName;
    if (dto.ageRange !== undefined) prefs.ageRange = dto.ageRange;
    if (dto.gender !== undefined) prefs.gender = dto.gender;
    if (dto.favouriteTvMovies !== undefined)
      prefs.favouriteTvMovies = dto.favouriteTvMovies;
    if (dto.hobbiesInterests !== undefined)
      prefs.hobbiesInterests = dto.hobbiesInterests;
    if (dto.learningAreas !== undefined)
      prefs.learningAreas = dto.learningAreas;
    if (dto.skippedOnboarding !== undefined)
      prefs.skippedOnboarding = dto.skippedOnboarding;

    if (dto.fullName !== undefined || dto.ageRange !== undefined || dto.gender !== undefined ||
        dto.favouriteTvMovies !== undefined || dto.hobbiesInterests !== undefined ||
        dto.learningAreas !== undefined) {
      prefs.onboardingCompletedAt = new Date();
    }

    return await this.personalizationRepo.save(prefs);
  }

  /**
   * Mark onboarding as completed (without full profile update).
   */
  async completeOnboarding(
    userId: string,
    opts?: { email?: string; tenantId?: string },
  ): Promise<UserPersonalization> {
    await this.ensureUser(userId, opts);
    let prefs = await this.personalizationRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.personalizationRepo.create({
        userId,
        favouriteTvMovies: [],
        hobbiesInterests: [],
        learningAreas: [],
      });
    }
    prefs.onboardingCompletedAt = new Date();
    prefs.skippedOnboarding = false;
    return await this.personalizationRepo.save(prefs);
  }

  /**
   * Mark onboarding as skipped.
   */
  async skipOnboarding(
    userId: string,
    opts?: { email?: string; tenantId?: string },
  ): Promise<UserPersonalization> {
    await this.ensureUser(userId, opts);
    let prefs = await this.personalizationRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.personalizationRepo.create({
        userId,
        favouriteTvMovies: [],
        hobbiesInterests: [],
        learningAreas: [],
        skippedOnboarding: true,
      });
    } else {
      prefs.skippedOnboarding = true;
    }
    return await this.personalizationRepo.save(prefs);
  }

  /**
   * Get curated options for a category with fallback by age/gender.
   * Priority: (age+gender) -> age -> gender -> default (age_range='', gender='').
   * Returns empty array if no options configured (avoids 500/404 for empty categories).
   */
  async getOptions(
    category: string,
    ageRange?: string,
    gender?: string,
  ): Promise<{ id: string; label: string }[]> {
    try {
      const age = ageRange?.trim() || '';
      const gen = gender?.trim() || '';

      const candidates = [
        { ageRange: age, gender: gen },
        { ageRange: age, gender: '' },
        { ageRange: '', gender: gen },
        { ageRange: '', gender: '' },
      ];

      for (const c of candidates) {
        const row = await this.optionsRepo.findOne({
          where: { category, ageRange: c.ageRange, gender: c.gender },
        });
        if (row) {
          return (row.options ?? []) as { id: string; label: string }[];
        }
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get all option variants for super-admin (grouped by category).
   */
  async getAllOptionsForAdmin(): Promise<{
    [category: string]: { ageRange: string; gender: string; options: { id: string; label: string }[] }[];
  }> {
    try {
      const rows = await this.optionsRepo.find({ order: { category: 'ASC', ageRange: 'ASC', gender: 'ASC' } });
      const result: Record<string, { ageRange: string; gender: string; options: { id: string; label: string }[] }[]> = {};
      for (const row of rows) {
        if (!result[row.category]) result[row.category] = [];
        result[row.category].push({
          ageRange: row.ageRange || '',
          gender: row.gender || '',
          options: row.options as { id: string; label: string }[],
        });
      }
      return result;
    } catch (err) {
      console.error('[UserPersonalization] getAllOptionsForAdmin error:', (err as Error)?.message);
      return { tv_movies: [], hobbies: [], learning_areas: [] };
    }
  }

  /**
   * Get options for a category (legacy - returns default only).
   */
  async getAllOptions(): Promise<
    Record<string, { id: string; label: string }[]>
  > {
    const rows = await this.optionsRepo.find({ where: { ageRange: '', gender: '' } });
    const result: Record<string, { id: string; label: string }[]> = {};
    for (const row of rows) {
      result[row.category] = row.options as { id: string; label: string }[];
    }
    return result;
  }

  /**
   * Update options for a category variant (super-admin only).
   */
  async updateOptions(
    category: string,
    options: { id: string; label: string }[] | undefined,
    ageRange = '',
    gender = '',
  ): Promise<PersonalizationOption> {
    const opts = Array.isArray(options) ? options : [];
    const age = ageRange?.trim() ?? '';
    const gen = gender?.trim() ?? '';
    try {
      let row = await this.optionsRepo.findOne({
        where: { category, ageRange: age, gender: gen },
      });
      if (!row) {
        const { randomUUID } = await import('crypto');
        row = this.optionsRepo.create({
          id: randomUUID(),
          category,
          ageRange: age,
          gender: gen,
          options: opts,
        });
      } else {
        row.options = opts;
      }
      return await this.optionsRepo.save(row);
    } catch (err) {
      console.error('[UserPersonalization] updateOptions error:', (err as Error)?.message, (err as Error)?.stack);
      throw err;
    }
  }

  /**
   * Delete a variant (super-admin only). Does not allow deleting default (ageRange='', gender='').
   */
  async deleteVariant(
    category: string,
    ageRange: string,
    gender: string,
  ): Promise<void> {
    const a = ageRange?.trim() || '';
    const g = gender?.trim() || '';
    if (!a && !g) {
      throw new NotFoundException('Cannot delete the default variant');
    }
    const row = await this.optionsRepo.findOne({
      where: { category, ageRange: a, gender: g },
    });
    if (row) {
      await this.optionsRepo.remove(row);
    }
  }

  /**
   * Aggregate popular selections across all users (for super-admin dashboard).
   */
  async getPopularSelections(): Promise<{
    tv_movies: { id: string; label: string; count: number }[];
    hobbies: { id: string; label: string; count: number }[];
    learning_areas: { id: string; label: string; count: number }[];
  }> {
    try {
      const all = await this.personalizationRepo.find();
      const tvCounts = new Map<string, number>();
      const hobbyCounts = new Map<string, number>();
      const learningCounts = new Map<string, number>();
      const optionsMap = await this.getAllOptions();

      for (const pref of all) {
        for (const id of pref.favouriteTvMovies || []) {
          tvCounts.set(id, (tvCounts.get(id) || 0) + 1);
        }
        for (const id of pref.hobbiesInterests || []) {
          hobbyCounts.set(id, (hobbyCounts.get(id) || 0) + 1);
        }
        for (const id of pref.learningAreas || []) {
          learningCounts.set(id, (learningCounts.get(id) || 0) + 1);
        }
      }

      const toSorted = (counts: Map<string, number>, opts: { id: string; label: string }[]) => {
        const labelMap = new Map(opts.map((o) => [o.id, o.label]));
        return Array.from(counts.entries())
          .map(([id, count]) => ({ id, label: labelMap.get(id) || id, count }))
          .sort((a, b) => b.count - a.count);
      };

      return {
        tv_movies: toSorted(tvCounts, optionsMap.tv_movies || []),
        hobbies: toSorted(hobbyCounts, optionsMap.hobbies || []),
        learning_areas: toSorted(learningCounts, optionsMap.learning_areas || []),
      };
    } catch (err) {
      console.error('[UserPersonalization] getPopularSelections error:', (err as Error)?.message);
      return { tv_movies: [], hobbies: [], learning_areas: [] };
    }
  }
}
