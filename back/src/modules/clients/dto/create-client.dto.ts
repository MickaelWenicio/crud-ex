import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Cliente XPTO' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'cliente@xpto.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '12345678000195', description: 'CNPJ com 14 digitos numericos' })
  @IsString()
  @Matches(/^\d{14}$/, { message: 'cnpj must have 14 digits' })
  cnpj!: string;

  @ApiPropertyOptional({ example: 'Empresa XPTO LTDA' })
  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @ApiPropertyOptional({ example: 'XPTO' })
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiPropertyOptional({ example: 'Rua A, 100 - Sao Paulo/SP' })
  @IsOptional()
  @IsString()
  address?: string;
}
