import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../common/constants/roles.enum';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { ClientsService } from '../services/clients.service';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('cnpj/:cnpj/enrich')
  @ApiOperation({ summary: 'Consultar dados de CNPJ em API externa (ADMIN)' })
  @ApiParam({ name: 'cnpj', example: '12345678000195' })
  @ApiOkResponse({ description: 'Dados do CNPJ retornados pela API externa' })
  enrichByCnpj(@Param('cnpj') cnpj: string) {
    return this.clientsService.enrichByCnpj(cnpj);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes com paginacao e busca (ADMIN/USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, example: '37202552000192' })
  @Roles(Role.ADMIN, Role.USER)
  @ApiOkResponse({ description: 'Lista de clientes' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Pesquisar cliente por nome, email, CNPJ ou razao social' })
  @ApiQuery({ name: 'term', required: true, example: 'cliente@empresa.com' })
  @ApiOkResponse({ description: 'Lista de clientes encontrados' })
  search(@Query('term') term: string) {
    return this.clientsService.searchByTerm(term);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cliente por ID (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-cliente-1' })
  @ApiOkResponse({ description: 'Cliente encontrado' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar cliente (ADMIN)' })
  @ApiBody({ type: CreateClientDto })
  @ApiOkResponse({ description: 'Cliente criado' })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-cliente-1' })
  @ApiBody({ type: UpdateClientDto })
  @ApiOkResponse({ description: 'Cliente atualizado' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover cliente (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-cliente-1' })
  @ApiNoContentResponse({ description: 'Cliente removido' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.clientsService.remove(id);
  }
}
