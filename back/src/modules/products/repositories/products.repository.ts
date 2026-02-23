import { Injectable } from '@nestjs/common';
import { Prisma, Product, ProductImage } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type ProductFindManyArgs = NonNullable<Parameters<PrismaService['product']['findMany']>[0]>;
type ProductCountWhere = NonNullable<Parameters<PrismaService['product']['count']>[0]>['where'];
type ProductCreateData = NonNullable<Parameters<PrismaService['product']['create']>[0]>['data'];
type ProductUpdateData = NonNullable<Parameters<PrismaService['product']['update']>[0]>['data'];
type ProductImageCreateData = NonNullable<Parameters<PrismaService['productImage']['create']>[0]>['data'];

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: ProductFindManyArgs): Promise<Product[]> {
    return this.prisma.product.findMany(args);
  }

  count(where?: ProductCountWhere): Promise<number> {
    return this.prisma.product.count({ where });
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  create(data: ProductCreateData): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: ProductUpdateData): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  delete(id: string): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }

  async deleteAndRecalculateOrders(productId: string): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const related = await tx.orderItem.findMany({
        where: { productId },
        select: { orderId: true },
      });
      const affectedOrderIds = Array.from(new Set(related.map((item) => item.orderId)));

      if (affectedOrderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { productId } });

        const groupedTotals = await tx.orderItem.groupBy({
          by: ['orderId'],
          where: { orderId: { in: affectedOrderIds } },
          _sum: { subtotal: true },
        });

        const totalsMap = new Map(
          groupedTotals.map((group) => [group.orderId, group._sum.subtotal ?? new Prisma.Decimal(0)]),
        );

        for (const orderId of affectedOrderIds) {
          const totalAmount = totalsMap.get(orderId) ?? new Prisma.Decimal(0);
          await tx.order.update({
            where: { id: orderId },
            data: { totalAmount },
          });
        }
      }

      await tx.product.delete({ where: { id: productId } });
    });
  }

  createImage(data: ProductImageCreateData): Promise<ProductImage> {
    return this.prisma.productImage.create({ data });
  }

  listImages(productId: string): Promise<ProductImage[]> {
    return this.prisma.productImage.findMany({ where: { productId } });
  }

  findImage(productId: string, imageId: string): Promise<ProductImage | null> {
    return this.prisma.productImage.findFirst({ where: { productId, id: imageId } });
  }

  deleteImage(imageId: string): Promise<ProductImage> {
    return this.prisma.productImage.delete({ where: { id: imageId } });
  }

  countOrderItemRefs(productId: string): Promise<number> {
    return this.prisma.orderItem.count({ where: { productId } });
  }
}
