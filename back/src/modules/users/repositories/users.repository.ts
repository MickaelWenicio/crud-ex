import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type UserFindManyArgs = NonNullable<Parameters<PrismaService['user']['findMany']>[0]>;
type UserCountWhere = NonNullable<Parameters<PrismaService['user']['count']>[0]>['where'];
type UserCreateData = NonNullable<Parameters<PrismaService['user']['create']>[0]>['data'];
type UserUpdateData = NonNullable<Parameters<PrismaService['user']['update']>[0]>['data'];

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: UserFindManyArgs): Promise<User[]> {
    return this.prisma.user.findMany(args);
  }

  count(where?: UserCountWhere): Promise<number> {
    return this.prisma.user.count({ where });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: UserCreateData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UserUpdateData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
