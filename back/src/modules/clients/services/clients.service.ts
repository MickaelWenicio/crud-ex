import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { resolveSortBy } from '../../../common/utils/sorting.util';
import { CnpjGateway } from '../gateways/cnpj.gateway';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientsRepository } from '../repositories/clients.repository';

@Injectable()
export class ClientsService {
  constructor(
    private readonly clientsRepository: ClientsRepository,
    private readonly cnpjGateway: CnpjGateway,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const allowedSortFields = [
      'name',
      'email',
      'cnpj',
      'razaoSocial',
      'nomeFantasia',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = resolveSortBy(query.sortBy, allowedSortFields, 'createdAt');
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();
    const digits = search?.replace(/\D/g, '');
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { razaoSocial: { contains: search, mode: 'insensitive' as const } },
            { nomeFantasia: { contains: search, mode: 'insensitive' as const } },
            { address: { contains: search, mode: 'insensitive' as const } },
            { cnpj: { contains: digits || search } },
          ],
        }
      : undefined;

    const [clients, total] = await Promise.all([
      this.clientsRepository.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [sortBy]: query.order } as never,
      }),
      this.clientsRepository.count(where),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.clientsRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async create(dto: CreateClientDto) {
    try {
      return await this.clientsRepository.create(dto);
    } catch {
      throw new BadRequestException('Unable to create client');
    }
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    try {
      return await this.clientsRepository.update(id, dto);
    } catch {
      throw new BadRequestException('Unable to update client');
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.clientsRepository.deleteWithOrders(id);
  }

  enrichByCnpj(cnpj: string) {
    return this.cnpjGateway.enrich(cnpj);
  }

  searchByTerm(term: string) {
    const value = term.trim();
    if (!value) return [];
    return this.clientsRepository.searchByTerm(value, 20);
  }
}
