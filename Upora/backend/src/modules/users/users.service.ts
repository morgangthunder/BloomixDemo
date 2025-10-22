import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(tenantId?: string): Promise<User[]> {
    const where = tenantId ? { tenantId } : {};
    return await this.usersRepository.find({ where });
  }

  async findOne(id: string, tenantId?: string): Promise<User> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const user = await this.usersRepository.findOne({ where });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId?: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    await this.usersRepository.remove(user);
  }

  async incrementTokenUsage(userId: string, tokensUsed: number): Promise<User> {
    const user = await this.findOne(userId);
    user.grokTokensUsed += tokensUsed;
    return await this.usersRepository.save(user);
  }

  async getTokenUsage(userId: string, tenantId?: string) {
    const user = await this.findOne(userId, tenantId);
    
    const monthlyUsage = user.grokTokensUsed || 0;
    const monthlyLimit = user.grokTokenLimit || 10000;
    const percentUsed = Math.round((monthlyUsage / monthlyLimit) * 100);
    const remaining = monthlyLimit - monthlyUsage;
    
    // Calculate reset date (30 days from user creation)
    const createdDate = new Date(user.createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const cyclesCompleted = Math.floor(daysSinceCreation / 30);
    const nextResetDate = new Date(createdDate);
    nextResetDate.setDate(nextResetDate.getDate() + (cyclesCompleted + 1) * 30);
    const daysUntilReset = Math.ceil((nextResetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      monthlyUsage,
      monthlyLimit,
      percentUsed,
      remaining,
      subscriptionTier: user.subscription || 'free',
      resetDate: nextResetDate.toISOString(),
      daysUntilReset,
      warningLevel: percentUsed >= 90 ? 'critical' : percentUsed >= 75 ? 'warning' : 'ok'
    };
  }

  // TODO: Implement earnings tracking via payouts table in Phase 7
  // async updateEarnings(userId: string, earnings: number): Promise<User> {
  //   const user = await this.findOne(userId);
  //   // Earnings tracked in payouts table, not user table
  //   return await this.usersRepository.save(user);
  // }
}
