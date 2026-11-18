# Lacoster Stock

Sistema web simples de gestão de estoque: listar, criar, editar e excluir produtos (descrição, preço e observação), com login por usuário/senha e MongoDB Atlas.

## Tecnologias utilizadas

- **Next.js** (App Router) + TypeScript
- **React** + Tailwind CSS
- **MongoDB Atlas** (driver oficial `mongodb`)
- **Vercel** (deploy + variáveis de ambiente)
- Autenticação por cookie HTTP-only assinado (HMAC-SHA256)

## Decisões técnicas

### Estrutura do banco

Collection `produtos` com documentos enxutos, espelhando o Excel de migração:

Collection: **`produtos`**

```json
{
  "name": "abracadeira nylon 200x35",
  "base_value": 13.9,
  "markup_percentage": 141,
  "final_value": 33.5,
  "discount_percentage": 0,
  "discounted_value": 33.5,
  "notes": "nota / margem / fornecedor",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

Colunas na UI: **Produto, custo, % lucro, venda, % desc, final, notas**.

- `venda` (`final_value`) = custo × (1 + % lucro / 100)
- `final` (`discounted_value`) = venda × (1 - % desc / 100)

Migration: `npm run migrate:discount`

Sem multi-tenant nesta versão (uso interno / um login). Busca por regex em `name` e `notes`.

### Integração com LLM

Não há integração com LLM neste projeto. O foco é CRUD operacional de estoque.

### Multi-tenancy

Não implementado. Um único conjunto de credenciais (`AUTH_USER` / `AUTH_PASSWORD`) protege o app inteiro. Isolamento por organização pode ser adicionado depois com `orgId` nos documentos.

### Desafios e soluções

- Arquivos `.nx1` do Nextar/NexusDB são binários: a migração parte do Excel (`descricao`, `preço`, `observação`), não do dump bruto.
- Auth no middleware da Vercel roda em Edge: assinatura do cookie feita com **Web Crypto**, não `crypto` do Node.
- Conexão Mongo reutilizada via cache global no runtime serverless.

## Funcionalidades implementadas

### Obrigatórias

- [x] Login com usuário e senha via `.env`
- [x] Listar produtos
- [x] Criar produto
- [x] Editar produto
- [x] Excluir produto
- [x] Campos: descrição, preço, observação
- [x] Busca por texto
- [x] Layout 100% responsivo (cards no mobile, tabela no desktop)
- [x] Pronto para MongoDB Atlas + env na Vercel

### Diferenciais

- [x] Sessão em cookie HTTP-only (7 dias)
- [x] UI mobile-first com brand Lacoster Stock
- [ ] Importação automática do Excel (próximo passo)
- [ ] Controle de quantidade / movimentação

## Setup local

1. Crie o cluster free no [MongoDB Atlas](https://cloud.mongodb.com), libere IP (`0.0.0.0/0` se for Vercel) e copie a connection string.

2. Em `sistema/lacoster-stock`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

3. Preencha `.env.local`:

```env
MONGODB_URI=mongodb+srv://...
AUTH_USER=admin
AUTH_PASSWORD=sua-senha
AUTH_SECRET=um-segredo-longo-aleatorio
```

4. Abra `http://localhost:3000`.

## Deploy na Vercel

1. Suba o repo e importe o projeto na Vercel (root: `sistema/lacoster-stock` se o monorepo for a pasta `estoque`).
2. Configure as mesmas variáveis: `MONGODB_URI`, `AUTH_USER`, `AUTH_PASSWORD`, `AUTH_SECRET`.
3. Deploy.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — sobe o build
