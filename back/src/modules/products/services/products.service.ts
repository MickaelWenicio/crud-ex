import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { resolveSortBy } from '../../../common/utils/sorting.util';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll(query: PaginationQueryDto) {
    const allowedSortFields = ['name', 'salePrice', 'stock', 'createdAt', 'updatedAt'] as const;
    const sortBy = resolveSortBy(query.sortBy, allowedSortFields, 'createdAt');
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;
    const [products, total] = await Promise.all([
      this.productsRepository.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [sortBy]: query.order } as never,
      }),
      this.productsRepository.count(where),
    ]);

    return {
      data: products,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  create(dto: CreateProductDto) {
    return this.productsRepository.create({
      ...dto,
      salePrice: dto.salePrice,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.productsRepository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.productsRepository.deleteAndRecalculateOrders(id);
  }

  async uploadImages(productId: string, files: Express.Multer.File[]) {
    await this.findOne(productId);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const created = [];
    for (const file of files) {
      const relativePath = `${process.env.UPLOAD_DIR ?? 'uploads'}/${file.filename}`.replace(
        /\\/g,
        '/',
      );
      const image = await this.productsRepository.createImage({
        product: { connect: { id: productId } },
        path: relativePath,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      });
      created.push(image);
    }

    return created;
  }

  async listImages(productId: string) {
    await this.findOne(productId);
    const images = await this.productsRepository.listImages(productId);
    return images.map((image) => ({
      ...image,
      url: `/uploads/${image.filename}`,
    }));
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.productsRepository.findImage(productId, imageId);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const fullPath = path.isAbsolute(image.path)
      ? image.path
      : path.resolve(process.cwd(), image.path);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await this.productsRepository.deleteImage(image.id);
  }
}
