# CRUD EX Frontend

Aplicacao Angular para consumo da API NestJS do projeto CRUD EX.

## 1. Objetivo
Entregar interface para:
- autenticacao
- gestao de usuarios (admin)
- gestao de clientes (admin)
- gestao de produtos e imagens
- gestao de pedidos com itens e status

## 2. Stack e decisoes
- Angular 20 (standalone components)
- Angular Material (componentes de UI e dialog)
- SweetAlert2 (feedback de confirmacao e erro)
- Reactive Forms (validacao de formularios)
- Interceptor HTTP (JWT + refresh + traducao de erro)
- Docker + Nginx (deploy simples do front buildado)

## 3. Estrutura principal
- `src/app/core`
  - `services`: integracao HTTP com backend
  - `guards`: autenticacao e autorizacao por role
  - `interceptors`: injecao de token e refresh
  - `utils/error-message.util.ts`: traducao de erros do backend para PT-BR
- `src/app/features`
  - `auth`
  - `layout`
  - `home`
  - `users`
  - `clients`
  - `products`
  - `orders`
- `src/styles`: estilos globais e padronizacao visual

## 4. Integracao com backend
Arquivo:
- `src/environments/environment.ts`

Padrao:
```ts
apiUrl: 'http://localhost:3000/api/v1'
```

Swagger backend:
- `http://localhost:3000/api/docs`

## 5. Permissoes no front (comportamento atual)
- `ADMIN`
  - ve e gerencia usuarios
  - ve e gerencia clientes
  - ve/cria/edita/exclui produtos
  - ve/cria/edita/exclui pedidos
- `USER`
  - ve produtos
  - nao ve botao de criar/editar/excluir produto
  - ve pedidos
  - pode criar pedido
  - pode atualizar pedido/status
  - nao pode excluir pedido
  - nao acessa telas de usuarios e clientes

Obs.: guardas de rota no front e RBAC no backend trabalham juntos.

## 6. Funcionalidades relevantes
- formularios em modal para cadastro/edicao
- filtros e busca em tabelas usando backend (escalavel)
- status de pedido exibido em badge em portugues
- upload de multiplas imagens por produto
- visualizacao de imagens lado a lado com exclusao por icone
- mensagens de erro do backend traduzidas para usuario final
- linha de estado vazio em tabelas quando nao ha registros

## 7. Como rodar em desenvolvimento (hot reload)
Fluxo recomendado para editar em tempo real:

1. Suba o backend (ver README do backend).
2. No front:
```bash
cd front/app
npm install
npm start
```
3. Acesse:
- `http://localhost:4200`

Qualquer alteracao em `src/` recompila automaticamente.

## 8. Como rodar em Docker (build de producao)
```bash
cd front/app
docker compose up --build
```

Acesse:
- `http://localhost:4200`

Parar/remover:
```bash
docker compose down
```

## 9. Login no sistema
O login usa o usuario seedado no backend (`back/.env`):
- email: `DEFAULT_ADMIN_EMAIL`
- senha: `DEFAULT_ADMIN_PASSWORD`

Padrao de exemplo:
- `admin@local.test`
- `Admin123!`

## 10. Fluxo de autenticacao
1. login salva `accessToken` e `refreshToken` no `localStorage`
2. interceptor envia `Authorization: Bearer <token>`
3. quando recebe `401`, tenta `refresh` automaticamente
4. se refresh falhar, limpa sessao e redireciona para `/login`

## 11. Scripts uteis
```bash
npm start
npm run build
npm test
```

Observacao:
- teste unitario do Angular pode depender de browser headless configurado no ambiente.

## 12. Troubleshooting rapido
1. Front abre, mas API falha:
- valide `environment.apiUrl`
- confirme backend ativo em `localhost:3000`

2. Erro de CORS:
- ajuste `CORS_ORIGIN` no `.env` do backend para `http://localhost:4200`

3. Imagens nao carregam:
- confirme backend expondo `uploads` e URL correta no `ProductsService.getImageUrl`.
