import { HttpErrorResponse } from '@angular/common/http';

const exactTranslations: Record<string, string> = {
  'Internal server error': 'Erro interno do servidor.',
  Unauthorized: 'Nao autorizado.',
  'Invalid token': 'Token invalido.',
  'Forbidden resource': 'Acesso negado.',
  'Invalid credentials': 'Credenciais invalidas.',
  'Invalid refresh token': 'Refresh token invalido.',
  'Email already in use': 'E-mail ja esta em uso.',
  'Unable to create client': 'Nao foi possivel criar o cliente.',
  'Unable to update client': 'Nao foi possivel atualizar o cliente.',
  'Unable to create user': 'Nao foi possivel criar o usuario.',
  'Client not found': 'Cliente nao encontrado.',
  'Product not found': 'Produto nao encontrado.',
  'Order not found': 'Pedido nao encontrado.',
  'User not found': 'Usuario nao encontrado.',
  'Image not found': 'Imagem nao encontrada.',
  'No files uploaded': 'Nenhum arquivo foi enviado.',
  'Invalid product': 'Produto invalido.',
  'One or more products were not found': 'Um ou mais produtos nao foram encontrados.',
  'Could not fetch CNPJ data': 'Nao foi possivel consultar os dados do CNPJ.',
  'Product cannot be removed because it is referenced by orders':
    'O produto nao pode ser removido porque esta vinculado a pedidos.',
};

function translateValidationMessage(message: string): string {
  return message
    .replace(/ should not be empty/g, ' nao deve estar vazio')
    .replace(/ must be an email/g, ' deve ser um e-mail valido')
    .replace(/ must be a string/g, ' deve ser um texto')
    .replace(/ must be an integer number/g, ' deve ser um numero inteiro')
    .replace(/ must not be less than (\d+)/g, ' nao deve ser menor que $1')
    .replace(/ must not be greater than (\d+)/g, ' nao deve ser maior que $1')
    .replace(/ must be one of the following values: /g, ' deve ser um dos valores: ')
    .replace(/ must match .*$/g, ' possui formato invalido');
}

export function translateBackendMessage(raw: string): string {
  const normalized = raw?.trim();
  if (!normalized) return 'Ocorreu um erro inesperado.';

  if (exactTranslations[normalized]) {
    return exactTranslations[normalized];
  }

  const insufficientStockMatch = normalized.match(/^Insufficient stock for product\s+(.+)$/i);
  if (insufficientStockMatch) {
    return `Estoque insuficiente para o produto ${insufficientStockMatch[1]}.`;
  }

  const translatedValidation = translateValidationMessage(normalized);
  if (translatedValidation !== normalized) {
    return translatedValidation;
  }

  return normalized;
}

export function translateHttpError(error: HttpErrorResponse): HttpErrorResponse {
  const payload = error.error;
  if (!payload || typeof payload !== 'object') {
    return error;
  }

  const rawMessage = (payload as { message?: unknown }).message;
  if (!rawMessage) {
    return error;
  }

  const translatedMessage = Array.isArray(rawMessage)
    ? rawMessage.map((msg) => translateBackendMessage(String(msg)))
    : translateBackendMessage(String(rawMessage));

  return new HttpErrorResponse({
    error: {
      ...(payload as Record<string, unknown>),
      message: translatedMessage,
    },
    headers: error.headers,
    status: error.status,
    statusText: error.statusText,
    url: error.url ?? undefined,
  });
}
