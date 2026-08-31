# Publicação gratuita da SportFuture

Este projecto foi preparado para ser publicado em **Cloudflare Pages + Pages Functions + D1**, mantendo o domínio comprado na Hostinger. O domínio não precisa de ser transferido. A aplicação frontend é compilada para `dist/public`, as funções ficam em `functions/` e o catálogo é servido como `client/public/catalog.json`.

> Não coloques no GitHub, neste ficheiro ou em mensagens a `STRIPE_SECRET_KEY`, a `STRIPE_WEBHOOK_SECRET`, palavras-passe ou códigos de autenticação.

## 1. Criar o repositório GitHub

No GitHub, cria um repositório chamado `sportfuture-shop`. Recomenda-se que seja **privado** enquanto a configuração estiver a ser preparada. Depois, envia o conteúdo desta pasta para esse repositório.

## 2. Criar a base de dados D1

No painel Cloudflare, abre **Workers & Pages → D1 → Create database** e cria uma base chamada `sportfuture-db`. Guarda o `database_id` apresentado.

No ficheiro `wrangler.toml`, substitui:

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
```

pelo identificador real da base. O ficheiro `migrations/0001_initial.sql` contém as tabelas de utilizadores, encomendas, itens de encomenda e cupões.

Se usares o terminal com Wrangler autenticado, a sequência equivalente é:

```bash
npx wrangler d1 create sportfuture-db
npx wrangler d1 execute sportfuture-db --remote --file=migrations/0001_initial.sql
```

A migração deve ser executada uma única vez na base remota.

## 3. Criar o projecto Cloudflare Pages

Em **Workers & Pages**, escolhe **Create application → Pages → Connect to Git** e selecciona o repositório `sportfuture-shop`.

Usa estes valores de build:

| Campo | Valor |
|---|---|
| Framework preset | Vite, se aparecer; caso contrário, None |
| Build command | `pnpm install --frozen-lockfile && pnpm build` |
| Build output directory | `dist/public` |
| Root directory | `/` |
| Node version | `22`, se a opção existir |
|

As Pages Functions em `functions/` são detectadas automaticamente pela Cloudflare.

## 4. Ligar a base D1 ao Pages

Nas definições do projecto Pages, abre **Settings → Functions → D1 database bindings** e adiciona:

| Binding name | Base de dados |
|---|---|
| `DB` | `sportfuture-db` |

O nome do binding tem de ser exactamente `DB`, porque é o nome usado pelas funções.

## 5. Adicionar os Secrets do Stripe

No projecto Pages, abre **Settings → Variables and Secrets** e adiciona como secrets, para o ambiente **Production**:

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

A chave `sk_live_...` só deve ser adicionada quando o site estiver pronto para aceitar pagamentos reais. Enquanto estiveres a testar, usa as chaves de teste `sk_test_...` e um webhook de teste separado.

## 6. Configurar o webhook Stripe

No Stripe, abre **Developers → Webhooks → Add endpoint** e usa:

```text
https://www.sportfuture.shop/api/stripe/webhook
```

Selecciona pelo menos estes eventos:

```text
checkout.session.completed
checkout.session.expired
```

Copia o signing secret `whsec_...` desse endpoint para o secret `STRIPE_WEBHOOK_SECRET` no Cloudflare. Não uses o secret de outro endpoint.

## 7. Ligar o domínio da Hostinger

No projecto Cloudflare Pages, abre **Custom domains → Set up a custom domain** e adiciona primeiro `sportfuture.shop` e depois `www.sportfuture.shop`.

A Cloudflare apresentará os registos DNS necessários. No painel DNS da Hostinger, cria ou ajusta exactamente os registos indicados pela Cloudflare. Se a Cloudflare pedir a troca dos nameservers, copia os dois nameservers fornecidos e substitui os nameservers actuais do domínio na Hostinger. Não mantenhas registos A ou CNAME antigos a apontar para outro alojamento.

Depois da propagação, confirma estes endereços:

```text
https://sportfuture.shop
https://www.sportfuture.shop
https://www.sportfuture.shop/api/trpc/catalog.list
```

O último endereço pode devolver um erro de método ou de input quando aberto directamente; isso é normal. O importante é não devolver `404` da função quando a loja fizer o pedido tRPC.

## 8. Teste seguro antes de activar pagamentos reais

Primeiro publica com chaves Stripe de teste e confirma:

1. A página inicial abre no domínio próprio.
2. A pesquisa e os filtros mostram produtos.
3. Os calçados exibem números 35–46 sem falsos avisos de indisponibilidade.
4. O carrinho mantém a variante e o tamanho escolhidos.
5. O cupão `SF10` é validado no servidor.
6. O checkout Stripe abre em modo de teste.
7. Uma sessão concluída marca a encomenda como paga através do webhook.
8. Uma sessão cancelada liberta a reserva do cupão.

Só depois destes testes deves trocar para `sk_live_...` e criar/configurar o webhook live correspondente.

## Nota sobre o custo

A publicação usa os limites gratuitos da Cloudflare para começar. O Stripe continua sem mensalidade fixa, mas cobra as comissões normais quando há transacções. Os planos gratuitos têm limites de utilização; se a loja crescer, será necessário rever esses limites e a política vigente antes de ultrapassá-los.
