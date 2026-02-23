import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role as PrismaRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../common/constants/roles.enum';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { resolveSortBy } from '../../../common/utils/sorting.util';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';

type UserFindManyArgs = Parameters<UsersRepository['findMany']>[0];
type UserOrderBy = NonNullable<UserFindManyArgs['orderBy']>;
type UserUpdateData = Parameters<UsersRepository['update']>[1];

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(query: PaginationQueryDto) {
    const allowedSortFields = [
      'name',
      'email',
      'role',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = resolveSortBy(query.sortBy, allowedSortFields, 'createdAt');
    const orderBy = this.buildOrderBy(sortBy, query.order);
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();
    const isRoleSearch = search?.toUpperCase() === 'ADMIN' || search?.toUpperCase() === 'USER';
    const roleFilter = isRoleSearch
      ? [{ role: { equals: search?.toUpperCase() as 'ADMIN' | 'USER' } }]
      : [];
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            ...roleFilter,
          ],
        }
      : undefined;

    const [users, total] = await Promise.all([
      this.usersRepository.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
      }),
      this.usersRepository.count(where),
    ]);

    return {
      data: users.map(({ passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...rest }) => rest),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await this.usersRepository.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: this.toPrismaRole(dto.role),
      });
      const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safe } = user;
      return safe;
    } catch {
      throw new BadRequestException('Unable to create user');
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const data: UserUpdateData = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = this.toPrismaRole(dto.role);

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.usersRepository.update(id, data);
    const { passwordHash: _passwordHash, refreshTokenHash: _refreshTokenHash, ...safe } = user;
    return safe;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own user');
    }
    await this.usersRepository.delete(id);
  }

  private buildOrderBy(
    sortBy: 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt',
    order: 'asc' | 'desc',
  ): UserOrderBy {
    switch (sortBy) {
      case 'name':
        return { name: order };
      case 'email':
        return { email: order };
      case 'role':
        return { role: order };
      case 'updatedAt':
        return { updatedAt: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }

  private toPrismaRole(role: Role): PrismaRole {
    return role === Role.ADMIN ? PrismaRole.ADMIN : PrismaRole.USER;
  }
}
