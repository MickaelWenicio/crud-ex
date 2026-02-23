import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../../../common/constants/order-status.enum';
import { Role } from '../../../common/constants/roles.enum';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { resolveSortBy } from '../../../common/utils/sorting.util';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrdersRepository } from '../repositories/orders.repository';

type OrderFindManyArgs = Parameters<OrdersRepository['findMany']>[0];
type OrderOrderBy = NonNullable<OrderFindManyArgs['orderBy']>;

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async findAll(query: PaginationQueryDto) {
    const allowedSortFields = ['id', 'status', 'totalAmount', 'createdAt', 'updatedAt'] as const;
    const sortBy = resolveSortBy(query.sortBy, allowedSortFields, 'createdAt');
    const orderBy = this.buildOrderBy(sortBy, query.order);
    const skip = (query.page - 1) * query.limit;
    const where = this.buildWhere(query);

    const [orders, total] = await Promise.all([
      this.ordersRepository.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          client: true,
          items: { include: { product: true } },
        },
      }),
      this.ordersRepository.count(where),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  create(dto: CreateOrderDto, user: { sub: string; role: Role }) {
    return this.ordersRepository.createOrder({
      clientId: dto.clientId,
      createdByUserId: user.sub,
      items: dto.items,
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.ordersRepository.updateOrder(id, dto);
  }

  remove(id: string) {
    return this.ordersRepository.deleteOrder(id);
  }

  async findMine(userId: string, query: PaginationQueryDto) {
    const allowedSortFields = ['id', 'status', 'totalAmount', 'createdAt', 'updatedAt'] as const;
    const sortBy = resolveSortBy(query.sortBy, allowedSortFields, 'createdAt');
    const orderBy = this.buildOrderBy(sortBy, query.order);
    const skip = (query.page - 1) * query.limit;
    const where = this.buildWhere(query, userId);

    const [orders, total] = await Promise.all([
      this.ordersRepository.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          client: true,
          items: { include: { product: true } },
        },
      }),
      this.ordersRepository.count(where),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private buildWhere(query: PaginationQueryDto, userId?: string) {
    const search = query.search?.trim();
    const statusFilter = this.mapStatusSearch(search);

    if (!search) {
      return {
        ...(userId ? { createdByUserId: userId } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
      };
    }

    return {
      ...(userId ? { createdByUserId: userId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      OR: [
        { id: { contains: search, mode: 'insensitive' as const } },
        ...(statusFilter ? [{ status: { equals: statusFilter } }] : []),
        { client: { name: { contains: search, mode: 'insensitive' as const } } },
        { client: { email: { contains: search, mode: 'insensitive' as const } } },
        { client: { cnpj: { contains: search.replace(/\D/g, '') || search } } },
        {
          items: {
            some: {
              product: { name: { contains: search, mode: 'insensitive' as const } },
            },
          },
        },
      ],
    };
  }

  private mapStatusSearch(search?: string): OrderStatus | undefined {
    if (!search) return undefined;
    const normalized = search
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalized.includes('pend') || normalized.includes('pending')) return OrderStatus.PENDING;
    if (normalized.includes('aprov') || normalized.includes('approved')) return OrderStatus.APPROVED;
    if (normalized.includes('cancel') || normalized.includes('cancelled')) return OrderStatus.CANCELLED;
    return undefined;
  }

  private buildOrderBy(
    sortBy: 'id' | 'status' | 'totalAmount' | 'createdAt' | 'updatedAt',
    order: 'asc' | 'desc',
  ): OrderOrderBy {
    switch (sortBy) {
      case 'id':
        return { id: order };
      case 'status':
        return { status: order };
      case 'totalAmount':
        return { totalAmount: order };
      case 'updatedAt':
        return { updatedAt: order };
      case 'createdAt':
      default:
        return { createdAt: order };
    }
  }
}
