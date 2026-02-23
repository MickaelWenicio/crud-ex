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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Role } from '../../../common/constants/roles.enum';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsService } from '../services/products.service';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Listar produtos com paginacao (ADMIN/USER)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, example: 'Notebook' })
  @ApiOkResponse({ description: 'Lista de produtos' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Buscar produto por ID (ADMIN/USER)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiOkResponse({ description: 'Produto encontrado' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar produto (ADMIN)' })
  @ApiBody({ type: CreateProductDto })
  @ApiOkResponse({ description: 'Produto criado' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar produto (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ description: 'Produto atualizado' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover produto (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiNoContentResponse({ description: 'Produto removido' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.productsService.remove(id);
  }

  @Post(':id/images')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Upload de imagens de produto (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Imagens salvas com sucesso' })
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: process.env.UPLOAD_DIR ?? 'uploads',
        filename: (_, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: Number(process.env.MAX_FILE_SIZE ?? 5_242_880) },
    }),
  )
  uploadImages(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.productsService.uploadImages(id, files);
  }

  @Get(':id/images')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Listar imagens do produto (ADMIN/USER)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiOkResponse({ description: 'Lista de imagens do produto' })
  listImages(@Param('id') id: string) {
    return this.productsService.listImages(id);
  }

  @Delete(':id/images/:imageId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover imagem de produto (ADMIN)' })
  @ApiParam({ name: 'id', example: 'uuid-produto-1' })
  @ApiParam({ name: 'imageId', example: 'uuid-imagem-1' })
  @ApiNoContentResponse({ description: 'Imagem removida' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeImage(@Param('id') id: string, @Param('imageId') imageId: string): Promise<void> {
    await this.productsService.removeImage(id, imageId);
  }
}
