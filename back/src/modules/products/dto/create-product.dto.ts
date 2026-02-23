import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Notebook Pro 14' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Notebook para uso corporativo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4999.9 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice!: number;

  @ApiProperty({ example: 25 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  stock!: number;
}
