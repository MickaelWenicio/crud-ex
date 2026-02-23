import { BadGatewayException, Injectable } from '@nestjs/common';

@Injectable()
export class CnpjGateway {
  async enrich(cnpj: string): Promise<Record<string, unknown>> {
    const normalized = cnpj.replace(/\D/g, '');
    const providers = [
      {
        url: `${process.env.CNPJ_API_BASE_URL ?? 'https://brasilapi.com.br/api/cnpj/v1'}/${normalized}`,
        source: 'brasilapi',
      },
      {
        url: `https://www.receitaws.com.br/v1/cnpj/${normalized}`,
        source: 'receitaws',
      },
    ] as const;

    for (const provider of providers) {
      try {
        const response = await this.fetchWithTimeout(provider.url, 6000);
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as Record<string, unknown>;
        return provider.source === 'brasilapi'
          ? this.normalizeFromBrasilApi(payload)
          : this.normalizeFromReceitaWs(payload);
      } catch {
        continue;
      }
    }

    throw new BadGatewayException('Could not fetch CNPJ data');
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'crud-ex-backend/1.0',
          Accept: 'application/json',
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeFromBrasilApi(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      cnpj: payload.cnpj,
      razao_social: payload.razao_social,
      nome_fantasia: payload.nome_fantasia,
      descricao_tipo_de_logradouro: payload.descricao_tipo_de_logradouro,
      logradouro: payload.logradouro,
      numero: payload.numero,
      bairro: payload.bairro,
      municipio: payload.municipio,
      uf: payload.uf,
      cep: payload.cep,
      email: payload.email,
      telefone: payload.ddd_telefone_1,
      source: 'brasilapi',
      raw: payload,
    };
  }

  private normalizeFromReceitaWs(payload: Record<string, unknown>): Record<string, unknown> {
    return {
      cnpj: payload.cnpj,
      razao_social: payload.nome,
      nome_fantasia: payload.fantasia,
      descricao_tipo_de_logradouro: '',
      logradouro: payload.logradouro,
      numero: payload.numero,
      bairro: payload.bairro,
      municipio: payload.municipio,
      uf: payload.uf,
      cep: payload.cep,
      email: payload.email,
      telefone: payload.telefone,
      source: 'receitaws',
      raw: payload,
    };
  }
}
