import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../../common/constants/order-status.enum';
import { OrderItemInputDto } from './order-item-input.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({ example: 'uuid-cliente-1' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.APPROVED })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    type: [OrderItemInputDto],
    example: [{ productId: 'uuid-produto-1', quantity: 1 }],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items?: OrderItemInputDto[];
}
