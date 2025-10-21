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

  // TODO: Implement earnings tracking via payouts table in Phase 7
  // async updateEarnings(userId: string, earnings: number): Promise<User> {
  //   const user = await this.findOne(userId);
  //   // Earnings tracked in payouts table, not user table
  //   return await this.usersRepository.save(user);
  // }
}
