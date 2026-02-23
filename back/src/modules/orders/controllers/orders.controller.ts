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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Listar pedidos com paginacao (ADMIN/USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'clientId', required: false, example: 'uuid-cliente-1' })
  @ApiQuery({ name: 'search', required: false, example: 'pendente' })
  @ApiOkResponse({ description: 'Lista de pedidos' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('me')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Listar meus pedidos (USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'clientId', required: false, example: 'uuid-cliente-1' })
  @ApiQuery({ name: 'search', required: false, example: 'aprovado' })
  @ApiOkResponse({ description: 'Lista de pedidos do usuario autenticado' })
  findMine(
    @CurrentUser() user: { sub: string },
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.findMine(user.sub, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Buscar pedido por ID (ADMIN/USER)' })
  @ApiParam({ name: 'id', example: 'uuid-pedido-1' })
  @ApiOkResponse({ description: 'Pedido encontrado' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Criar pedido (ADMIN/USER)' })
  @ApiBody({ type: CreateOrderDto })
  @ApiOkResponse({ description: 'Pedido criado com sucesso' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: { sub: string; role: Role }) {
    return this.ordersService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Atualizar pedido (ADMIN/USER)' })
  @ApiParam({ name: 'id', example: 'uuid-pedido-1' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({ description: 'Pedido atualizado com sucesso' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover pedido (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-pedido-1' })
  @ApiNoContentResponse({ description: 'Pedido removido' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.ordersService.remove(id);
  }
}
