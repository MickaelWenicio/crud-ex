import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from '../repositories/products.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteAndRecalculateOrders: jest.fn(),
      createImage: jest.fn(),
      listImages: jest.fn(),
      findImage: jest.fn(),
      deleteImage: jest.fn(),
    } as unknown as jest.Mocked<ProductsRepository>;

    service = new ProductsService(repository);
  });

  it('should delete product and recalculate affected orders', async () => {
    repository.findById.mockResolvedValue({ id: 'p1' } as never);

    await service.remove('p1');

    expect(repository.deleteAndRecalculateOrders).toHaveBeenCalledWith('p1');
  });

  it('should throw when trying to delete a non-existent product', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.remove('p1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
