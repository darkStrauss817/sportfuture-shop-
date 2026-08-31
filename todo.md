# Project TODO

- [x] Migrar o catálogo real do SportFuture sem alterar o futursport.pt
- [x] Migrar páginas de produto com imagens, preços, descontos e variantes
- [x] Implementar carrinho persistente com linhas de produto e tamanhos
- [x] Mostrar resumo do carrinho com subtotal, portes europeus fixos de 4,99 € e total
- [x] Adicionar campo de cupão SF10 no carrinho
- [x] Criar modelo de encomendas e linhas de encomenda na base de dados
- [x] Validar produtos, preços, variantes e totais exclusivamente no servidor
- [x] Limitar SF10 à primeira compra associada ao email
- [x] Registar a utilização de SF10 apenas após pagamento confirmado
- [x] Integrar Stripe Checkout sem expor a chave secreta no browser
- [x] Criar página de retorno de pagamento confirmado
- [x] Criar página de cancelamento de pagamento
- [x] Preparar variáveis de ambiente para modo de testes e futura passagem para LIVE
- [x] Preservar direção visual editorial monocromática e experiência responsiva
- [x] Escrever testes Vitest para cálculo de totais, portes, cupão e estados de pagamento
- [x] Validar a aplicação no browser em desktop e mobile
- [x] Criar checkpoint final e entregar a aplicação independente

## Correções identificadas na validação

- [x] Implementar descontos reais no frontend/backend, com preço original e percentagem no detalhe do produto
- [x] Criar tabela de linhas de encomenda e guardar itens, variantes e quantidades
- [x] Bloquear reutilização do SF10 com garantia idempotente por email, incluindo sessões concorrentes
- [x] Corrigir `/api/stripe/webhook` para usar `express.raw` antes de `express.json`
- [x] Testar o checkout Stripe em modo sandbox, incluindo redirecionamento e estado de retorno
- [x] Fazer os testes Vitest correrem com sucesso e cobrir webhook/estados de pagamento

## Correção de descontos

- [x] Garantir desconto visível entre 20% e 50% para todos os produtos, mesmo sem `compare_at_price`
- [x] Usar a mesma regra determinística de desconto no frontend, carrinho e servidor Stripe
- [x] Testar que nenhum produto da amostra fica sem preço original ou percentagem de desconto
- [x] Criar checkpoint da correção de descontos e entregar a nova versão

## Correção de consistência da variante promocional

- [x] Alinhar a lógica de desconto entre cartão, detalhe, carrinho e payload de checkout para a mesma variante
- [x] Testar um produto da grelha até ao detalhe e carrinho, confirmando percentagem e preço original idênticos

## Apresentação da promoção no carrinho

- [x] Mostrar no carrinho a percentagem de desconto e o preço original de cada linha
- [x] Validar visualmente a mesma variante na grelha, detalhe e carrinho
- [x] Criar checkpoint atualizado depois desta melhoria

## Checkpoint da correção final

- [x] Criar novo checkpoint após as correções finais de promoções, consistência e localStorage
- [x] Confirmar que o checkpoint inclui a exibição consistente na grelha, detalhe e carrinho

## Correção do menu superior

- [x] Corrigir abertura das três barras no topo
- [x] Garantir que Running, Futebol, Fitness e Basquetebol filtram o catálogo ao clicar
- [x] Garantir que Homem, Mulher, Criança e Todas as categorias continuam funcionais
- [x] Testar menu em desktop e mobile e guardar checkpoint atualizado

## Menu superior completo

- [x] Mostrar todas as categorias principais dentro das três barras: Todos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol
- [x] Testar cada uma das categorias diretamente no menu superior

## Validação adicional do menu

- [x] Testar funcionalmente o menu superior em mobile com abertura e seleção de categorias
- [x] Testar diretamente no menu superior Todos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol
- [x] Criar checkpoint novo após a correção final do menu

## Fecho da correção do menu

- [x] Repetir os cliques do menu num navegador com viewport móvel real quando disponível
- [x] Guardar o checkpoint final desta correção e entregar a versão atualizada

## Correção dos tamanhos de calçado

- [x] Garantir que todos os produtos de calçado têm opções 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45 e 46
- [x] Normalizar a seleção no detalhe sem alterar o preço ou o desconto da variante
- [x] Validar que os tamanhos ficam entre 35 e 46 no carrinho e no checkout server-side
- [x] Guardar checkpoint atualizado da correção dos tamanhos

## Correção de variantes reais de calçado

- [x] Ligar a escolha de tamanho de calçado às variantes reais disponíveis no produto
- [x] Substituir os dois controlos contraditórios por uma seleção única de tamanho/variante
- [x] Validar no servidor que o tamanho corresponde a uma variante real disponível antes do Stripe
- [x] Adicionar testes de tamanhos válidos e inválidos com produtos reais do catálogo
- [x] Guardar checkpoint atualizado apenas depois da validação final

## Revisão final completa

- [x] Auditar configuração do projeto, dependências, rotas, schema e migrações
- [x] Auditar catálogo, descontos, variantes reais e tamanhos 35–46
- [x] Testar menu, filtros, pesquisa, detalhe, carrinho e cupão SF10
- [x] Testar checkout Stripe, portes europeus, webhook e páginas de retorno
- [x] Rever acessibilidade, responsividade, mensagens de erro e estados vazios
- [x] Corrigir todos os problemas encontrados e atualizar a documentação de validação
- [x] Executar TypeScript, testes Vitest e build de produção
- [x] Validar visualmente desktop e mobile
- [x] Criar checkpoint da versão final revista e entregar ao utilizador

## Fecho da auditoria final — verificações adicionais

- [x] Testar explicitamente a pesquisa por texto no catálogo e registar o resultado
- [x] Validar pesquisa sem resultados, carrinho vazio, cupão inválido e erro de checkout
- [x] Confirmar no runtime atual que o erro antigo de `isValidSizeSelection` não reaparece
- [x] Só depois destas verificações marcar a revisão completa e criar o checkpoint final

## Correção solicitada — tamanhos sempre disponíveis

- [x] Garantir que nenhum artigo de calçado apresenta “tamanho não disponível” no detalhe
- [x] Corrigir a origem das variantes/tamanhos para disponibilizar 35–46 em todos os artigos de calçado
- [x] Validar seleção de tamanho, carrinho, checkout server-side e testes Vitest
- [x] Guardar checkpoint atualizado e entregar a versão corrigida
- [x] Testar explicitamente no servidor o checkout com um tamanho normalizado 35–46
- [x] Testar `checkout.createSession` com uma variante normalizada 35–46 até à criação dos line items/encomenda
- [x] Confirmar no servidor que o snapshot, a validação de tamanho e a criação da sessão não têm regressões
