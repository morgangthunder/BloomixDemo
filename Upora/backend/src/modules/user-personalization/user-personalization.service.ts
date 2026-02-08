import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { PersonalizationOption } from '../../entities/personalization-option.entity';
import { UpdateUserPersonalizationDto } from './dto/update-user-personalization.dto';

@Injectable()
export class UserPersonalizationService {
  constructor(
    @InjectRepository(UserPersonalization)
    private personalizationRepo: Repository<UserPersonalization>,
    @InjectRepository(PersonalizationOption)
    private optionsRepo: Repository<PersonalizationOption>,
  ) {}

  /**
   * Get current user's personalization. Creates empty row if none exists.
   */
  async getMine(userId: string): Promise<UserPersonalization> {
    let prefs = await this.personalizationRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.personalizationRepo.create({
        userId,
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
  ): Promise<UserPersonalization> {
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
  async completeOnboarding(userId: string): Promise<UserPersonalization> {
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
  async skipOnboarding(userId: string): Promise<UserPersonalization> {
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
   * Get curated options for a category (tv_movies, hobbies, learning_areas).
   */
  async getOptions(category: string): Promise<{ id: string; label: string }[]> {
    const row = await this.optionsRepo.findOne({ where: { category } });
    if (!row) {
      throw new NotFoundException(`Category '${category}' not found`);
    }
    return row.options as { id: string; label: string }[];
  }

  /**
   * Get all curated option categories and their options.
   */
  async getAllOptions(): Promise<
    Record<string, { id: string; label: string }[]>
  > {
    const rows = await this.optionsRepo.find();
    const result: Record<string, { id: string; label: string }[]> = {};
    for (const row of rows) {
      result[row.category] = row.options as { id: string; label: string }[];
    }
    return result;
  }

  /**
   * Update options for a category (super-admin only).
   */
  async updateOptions(
    category: string,
    options: { id: string; label: string }[],
  ): Promise<PersonalizationOption> {
    const row = await this.optionsRepo.findOne({ where: { category } });
    if (!row) {
      throw new NotFoundException(`Category '${category}' not found`);
    }
    row.options = options;
    return await this.optionsRepo.save(row);
  }

  /**
   * Aggregate popular selections across all users (for super-admin dashboard).
   */
  async getPopularSelections(): Promise<{
    tv_movies: { id: string; label: string; count: number }[];
    hobbies: { id: string; label: string; count: number }[];
    learning_areas: { id: string; label: string; count: number }[];
  }> {
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
  }
}
