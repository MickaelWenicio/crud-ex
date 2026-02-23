import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '../../../common/constants/order-status.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderItemInputDto } from '../dto/order-item-input.dto';

type OrderFindManyArgs = NonNullable<Parameters<PrismaService['order']['findMany']>[0]>;
type OrderCountWhere = NonNullable<Parameters<PrismaService['order']['count']>[0]>['where'];

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: OrderFindManyArgs) {
    return this.prisma.order.findMany(args);
  }

  count(where?: OrderCountWhere) {
    return this.prisma.order.count({ where });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        items: { include: { product: true } },
      },
    });
  }

  async createOrder(params: {
    clientId: string;
    createdByUserId: string;
    items: OrderItemInputDto[];
  }) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const client = await tx.client.findUnique({ where: { id: params.clientId } });
      if (!client) {
        throw new NotFoundException('Client not found');
      }

      const requestedByProduct = this.groupQuantitiesByProduct(params.items);
      const productIds = Array.from(requestedByProduct.keys());
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stock: true, salePrice: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('One or more products were not found');
      }

      const productMap = new Map<string, (typeof products)[number]>(
        products.map((product) => [product.id, product]),
      );
      for (const [productId, quantity] of requestedByProduct.entries()) {
        const product = productMap.get(productId);
        if (!product) {
          throw new BadRequestException('Invalid product');
        }
        if (product.stock < quantity) {
          throw new BadRequestException(`Insufficient stock for product ${product.id}`);
        }
      }

      const preparedItems = params.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException('Invalid product');
        }

        const unitPrice = product.salePrice;
        const subtotal = new Prisma.Decimal(unitPrice).mul(item.quantity);

        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      });

      const totalAmount = preparedItems.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      const order = await tx.order.create({
        data: {
          clientId: params.clientId,
          createdByUserId: params.createdByUserId,
          status: OrderStatus.PENDING,
          totalAmount,
          items: {
            create: preparedItems,
          },
        },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });

      for (const [productId, quantity] of requestedByProduct.entries()) {
        await tx.product.update({
          where: { id: productId },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });
      }

      return order;
    });
  }

  async updateOrder(
    id: string,
    params: {
      clientId?: string;
      status?: OrderStatus;
      items?: OrderItemInputDto[];
    },
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        throw new NotFoundException('Order not found');
      }

      if (params.clientId) {
        const client = await tx.client.findUnique({ where: { id: params.clientId } });
        if (!client) {
          throw new NotFoundException('Client not found');
        }
      }

      const currentStatus = existing.status;
      const nextStatus = params.status ?? existing.status;
      let totalAmount = existing.totalAmount;

      if (params.items) {
        if (currentStatus !== OrderStatus.CANCELLED) {
          await this.incrementStock(tx, existing.items);
        }

        await tx.orderItem.deleteMany({ where: { orderId: id } });

        const productIds = Array.from(new Set(params.items.map((item) => item.productId)));
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, stock: true, salePrice: true },
        });
        if (products.length !== productIds.length) {
          throw new BadRequestException('One or more products were not found');
        }

        const productMap = new Map<string, (typeof products)[number]>(
          products.map((product) => [product.id, product]),
        );
        const newItems = params.items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new BadRequestException('Invalid product');
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for product ${product.id}`);
          }

          const unitPrice = product.salePrice;
          const subtotal = new Prisma.Decimal(unitPrice).mul(item.quantity);

          return {
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            subtotal,
          };
        });

        totalAmount = newItems.reduce((acc, item) => acc.add(item.subtotal), new Prisma.Decimal(0));

        await tx.orderItem.createMany({ data: newItems });

        if (nextStatus !== OrderStatus.CANCELLED) {
          await this.ensureAndDecrementStock(tx, newItems);
        }
      } else if (currentStatus !== nextStatus) {
        if (currentStatus !== OrderStatus.CANCELLED && nextStatus === OrderStatus.CANCELLED) {
          await this.incrementStock(tx, existing.items);
        }

        if (currentStatus === OrderStatus.CANCELLED && nextStatus !== OrderStatus.CANCELLED) {
          await this.ensureAndDecrementStock(tx, existing.items);
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          clientId: params.clientId,
          status: params.status,
          totalAmount,
        },
        include: {
          client: true,
          items: { include: { product: true } },
        },
      });
    });
  }

  async deleteOrder(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        throw new NotFoundException('Order not found');
      }

      if (existing.status !== OrderStatus.CANCELLED) {
        await this.incrementStock(tx, existing.items);
      }

      await tx.order.delete({ where: { id } });
    });
  }

  private async incrementStock(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    const grouped = this.groupQuantitiesByProduct(items);
    for (const [productId, quantity] of grouped.entries()) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
    }
  }

  private async ensureAndDecrementStock(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    const grouped = this.groupQuantitiesByProduct(items);
    const productIds = Array.from(grouped.keys());

    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products were not found');
    }

    const stockByProduct = new Map(products.map((product) => [product.id, product.stock]));
    for (const [productId, quantity] of grouped.entries()) {
      const availableStock = stockByProduct.get(productId);
      if (availableStock === undefined || availableStock < quantity) {
        throw new BadRequestException(`Insufficient stock for product ${productId}`);
      }
    }

    for (const [productId, quantity] of grouped.entries()) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
    }
  }

  private groupQuantitiesByProduct(
    items: Array<{ productId: string; quantity: number }>,
  ): Map<string, number> {
    const grouped = new Map<string, number>();
    for (const item of items) {
      grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
    }
    return grouped;
  }
}
