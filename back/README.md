# CRUD EX Backend

API REST em NestJS com arquitetura em camadas, autenticacao JWT (access + refresh), RBAC, Prisma/PostgreSQL, upload de imagens e documentacao Swagger.

## 1. Objetivo
Este backend atende um painel administrativo de:
- usuarios
- clientes
- produtos (com imagens)
- pedidos (com itens e controle de estoque)

## 2. Arquitetura e organizacao
Padrao adotado por modulo:
- `Controller`: entrada HTTP, status code e contrato
- `Service`: regras de negocio e orquestracao
- `Repository`: acesso ao banco via Prisma

Estrutura principal:
- `src/main.ts`: bootstrap global (prefixo `/api`, versao `v1`, Swagger, pipes, filtros)
- `src/common`: guards, decorators, filtro de excecao, interceptors, DTOs comuns
- `src/modules/auth`: login, refresh, logout, register
- `src/modules/users`: CRUD de usuarios
- `src/modules/clients`: CRUD de clientes + enrich CNPJ
- `src/modules/products`: CRUD de produtos + imagens
- `src/modules/orders`: CRUD de pedidos + estoque
- `src/prisma`: modulo prisma
- `prisma/schema.prisma`: modelo de dados
- `prisma/seed.ts`: seed inicial (admin)

## 3. Tecnologias usadas e por que
- NestJS: estrutura modular e padrao enterprise para APIs
- Prisma: ORM tipado com transacoes claras
- PostgreSQL: banco relacional para entidades com forte relacionamento
- JWT + RBAC: autenticacao stateless com controle de perfil (`ADMIN`/`USER`)
- Swagger: documentacao viva da API em `/api/docs`
- Docker Compose: sobe API + banco sem setup manual complexo

## 4. Seguranca aplicada
- `helmet`
- CORS por variavel de ambiente (`CORS_ORIGIN`)
- `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`)
- filtro global de excecoes com envelope padrao
- hash de senha e refresh token com `bcrypt`
- `JwtAuthGuard` e `RolesGuard`
- rate limiting via `@nestjs/throttler` (inclui auth)

## 5. Modelo de dados (resumo)
- `User`
- `Client`
- `Product`
- `ProductImage`
- `Order`
- `OrderItem`

Relacoes criticas:
- `Order` pertence a `Client` e `User`
- `Order` possui varios `OrderItem`
- `OrderItem` referencia `Product`
- `Product` possui varias `ProductImage`

## 6. Regras de negocio criticas
- pedido nao pode ser criado sem itens
- item com quantidade <= 0 e rejeitado por validacao
- estoque e baixado na criacao do pedido
- cancelamento de pedido devolve estoque
- reativacao de pedido cancelado revalida e baixa estoque novamente
- exclusao de cliente remove pedidos relacionados e ajusta estoque dos pedidos ativos
- exclusao de produto remove o produto dos pedidos e recalcula total dos pedidos afetados
- busca paginada de listas com filtro no backend
- `sortBy` invalido e normalizado para `createdAt` (evita erro 500 por query invalida)

## 7. Permissoes por perfil
- `ADMIN`
  - acesso total a usuarios, clientes, produtos e pedidos
- `USER`
  - pode listar e visualizar produtos
  - pode listar, visualizar, criar e atualizar pedidos
  - nao pode excluir pedidos
  - nao acessa usuarios/clientes
  - nao cria/edita/exclui produtos

## 8. Prefixo, versao e documentacao
- Base API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

## 9. Variaveis de ambiente
Use `back/.env.example` como base para `back/.env`.

Variaveis principais:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CORS_ORIGIN`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE`
- `CNPJ_API_BASE_URL`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `DEFAULT_ADMIN_NAME`

## 10. Pre-requisitos
- Docker Desktop (com Docker Compose v2)
- Node.js 20.x
- npm 10.x

## 11. Quickstart (recomendado: API + banco com Docker)
1. Entre na pasta do back e crie e configure o `.env`:
```bash
cd back
cp .env.example .env
```

2. Suba API + banco:
```bash
docker compose up --build -d
```

3. Acesse:
- Swagger: `http://localhost:3000/api/docs`

Esse fluxo executa migrations e seed automaticamente no container da API.

## 12. Como rodar em desenvolvimento (hot reload local)
Opcao para editar codigo em tempo real com Node local:

1. Suba apenas o banco:
```bash
cd back
docker compose up -d postgres
```

2. Crie o `.env`:
```bash
cp .env.example .env
```

No PowerShell:
```powershell
Copy-Item .env.example .env
```

3. Instale dependencias e prepare Prisma:
```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Rode a API em watch:
```bash
npm run start:dev
```

5. Rode a API em docker:
```bash
docker compose up -d postgres
```

## 13. Credenciais iniciais
Vem da seed e sao lidas do `.env`:
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

Exemplo padrao do `.env.example`:
- email: `admin@local.test`
- senha: `Admin123!`

## 14. Fluxo de autenticacao
1. `POST /auth/login` retorna `accessToken` e `refreshToken`
2. enviar access token em `Authorization: Bearer <token>`
3. quando access expira, usar `POST /auth/refresh`
4. `POST /auth/logout` invalida refresh token salvo

## 15. Paginacao e filtros
Query padrao:
- `page`
- `limit`
- `sortBy`
- `order`
- `search`
- `clientId` (pedidos)

Resposta padrao:
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 10,
    "totalPages": 0
  }
}
```

## 16. Erro padrao
```json
{
  "timestamp": "2026-02-20T11:00:00.000Z",
  "path": "/api/v1/products",
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["name should not be empty"],
  "requestId": "uuid"
}
```

## 17. Rotas
Use Swagger para contrato completo e exemplos.

Dominios:
- Auth: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/register`
- Users: `/users`
- Clients: `/clients`, `/clients/search`, `/clients/cnpj/:cnpj/enrich`
- Products: `/products`, `/products/:id/images`
- Orders: `/orders`, `/orders/me`

Observacao:
- o script `npm run lint` depende de migracao para configuracao nova do ESLint v9 (flat config).

## 18. Troubleshooting rapido
1. Prisma/OpenSSL no Docker:
- este projeto usa imagem `node:20-bookworm-slim` com `openssl` instalado no Dockerfile.

2. Porta do banco com Docker:
- no host (Node local): `localhost:5433` (como esta no `.env.example`)
- dentro da rede do Docker Compose: `postgres:5432` (ja configurado no `docker-compose.yml`)

3. Erro de dependencias npm (`ERESOLVE`):
- use Node 20 + npm 10
- rode `npm ci` para instalar exatamente o `package-lock.json`

4. Erro de CNPJ enrich:
- depende da disponibilidade da API externa (`CNPJ_API_BASE_URL`).

5. Swagger nao abre:
- confira se API esta no ar em `:3000` e se `main.ts` subiu sem erro de env.
