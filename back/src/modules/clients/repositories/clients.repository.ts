import { Injectable } from '@nestjs/common';
import { Client, Prisma } from '@prisma/client';
import { OrderStatus } from '../../../common/constants/order-status.enum';
import { PrismaService } from '../../../prisma/prisma.service';

type ClientFindManyArgs = NonNullable<Parameters<PrismaService['client']['findMany']>[0]>;
type ClientCountWhere = NonNullable<Parameters<PrismaService['client']['count']>[0]>['where'];
type ClientCreateData = NonNullable<Parameters<PrismaService['client']['create']>[0]>['data'];
type ClientUpdateData = NonNullable<Parameters<PrismaService['client']['update']>[0]>['data'];

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: ClientFindManyArgs): Promise<Client[]> {
    return this.prisma.client.findMany(args);
  }

  count(where?: ClientCountWhere): Promise<number> {
    return this.prisma.client.count({ where });
  }

  findById(id: string): Promise<Client | null> {
    return this.prisma.client.findUnique({ where: { id } });
  }

  searchByTerm(term: string, limit = 20): Promise<Client[]> {
    const normalized = term.trim();
    const digitsOnly = term.replace(/\D/g, '');

    return this.prisma.client.findMany({
      where: {
        OR: [
          { cnpj: { contains: digitsOnly || normalized } },
          { email: { contains: normalized, mode: 'insensitive' } },
          { name: { contains: normalized, mode: 'insensitive' } },
          { razaoSocial: { contains: normalized, mode: 'insensitive' } },
          { nomeFantasia: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  create(data: ClientCreateData): Promise<Client> {
    return this.prisma.client.create({ data });
  }

  update(id: string, data: ClientUpdateData): Promise<Client> {
    return this.prisma.client.update({ where: { id }, data });
  }

  delete(id: string): Promise<Client> {
    return this.prisma.client.delete({ where: { id } });
  }

  async deleteWithOrders(clientId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orders = await tx.order.findMany({
        where: { clientId },
        include: { items: true },
      });

      const stockToReturn = new Map<string, number>();
      for (const order of orders) {
        if (order.status === OrderStatus.CANCELLED) continue;

        for (const item of order.items) {
          stockToReturn.set(item.productId, (stockToReturn.get(item.productId) ?? 0) + item.quantity);
        }
      }

      for (const [productId, quantity] of stockToReturn.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } },
        });
      }

      await tx.order.deleteMany({ where: { clientId } });
      await tx.client.delete({ where: { id: clientId } });
    });
  }
}
