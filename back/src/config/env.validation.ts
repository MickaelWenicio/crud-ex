import { BadRequestException } from '@nestjs/common';

type EnvInput = Record<string, unknown>;

function requiredString(input: EnvInput, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`Missing env var: ${key}`);
  }
  return value;
}

export function validateEnv(input: EnvInput): EnvInput {
  requiredString(input, 'DATABASE_URL');
  requiredString(input, 'JWT_ACCESS_SECRET');
  requiredString(input, 'JWT_REFRESH_SECRET');

  input.PORT = Number(input.PORT ?? 3000);
  input.MAX_FILE_SIZE = Number(input.MAX_FILE_SIZE ?? 5_242_880);

  return input;
}
