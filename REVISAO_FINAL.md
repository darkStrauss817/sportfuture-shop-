# Revisão final — SportFuture

## Correcção principal

A lógica de tamanhos foi revista para usar as opções reais do catálogo (`Tamanho`) e para normalizar variantes em falta ou marcadas como indisponíveis. Nos produtos de calçado são apresentados e seleccionáveis os números 35 a 46. Nos restantes produtos dimensionáveis são preservados os tamanhos definidos pelo catálogo, incluindo S, M, L, XL e XXL quando aplicável.

A mesma normalização é agora aplicada de forma consistente na grelha, no detalhe do produto, no carrinho, na validação server-side e na criação da sessão Stripe. Desta forma, um tamanho que aparece disponível na loja não é rejeitado posteriormente pelo checkout por uma divergência de variante.

## Revisão adicional

A inicialização do Stripe foi tornada segura quando a variável `STRIPE_SECRET_KEY` não está definida. O servidor deixa de falhar durante o carregamento e apresenta uma mensagem controlada apenas quando é necessário iniciar um checkout ou processar um webhook Stripe.

## Validações executadas

| Verificação | Resultado |
|---|---:|
| Produtos dimensionáveis auditados | 6.118 |
| Produtos com tamanhos em falta após normalização | 0 |
| Verificação TypeScript | Aprovada |
| Testes Vitest | 15/15 aprovados |
| Verificação Prettier | Aprovada |
| Build de produção | Aprovado |

O build apresenta apenas avisos pré-existentes relativos às variáveis opcionais de analytics (`VITE_ANALYTICS_ENDPOINT` e `VITE_ANALYTICS_WEBSITE_ID`); estes avisos não impedem a compilação nem afectam a correcção de stock e tamanhos.
