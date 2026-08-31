# Validation notes

A homepage SportFuture foi verificada em desktop (1280×720) e mobile (390×844). A direção visual monocromática, a faixa de portes e o hero editorial renderizaram corretamente. As páginas `/checkout/success` e `/checkout/cancelled` apresentaram mensagens claras. No mobile, o título da confirmação foi ajustado para uma escala tipográfica responsiva para evitar overflow.

O servidor arrancou sem erros de TypeScript após integrar o webhook Stripe antes do parser JSON. A base de dados criou as tabelas `orders` e `couponRedemptions` sem operações destrutivas.

A preview pública do projeto carregou através do backend, mostrou os produtos reais do catálogo e listou 6.118 produtos. O detalhe do primeiro produto abriu com imagem, preço e variante disponível, confirmando que a seleção de produto está ligada ao carrinho.

No preview, um produto foi adicionado ao carrinho com a variante Preto / M. O carrinho mostrou 1 unidade, campo SF10, subtotal de 22,39 €, portes Europa de 4,99 € e total de 27,38 €. Após introduzir SF10, o desconto apresentado foi de 2,24 € e o total passou a 25,14 €, confirmando a regra de 10% no resumo.

Após a correção, o catálogo passou a mostrar descontos derivados de `compare_at_price`, por exemplo -30% com preço promocional 22,39 € e preço original 31,99 €. No checkout do preview, o carrinho persistido foi aberto, foi usado um email de teste e a interface iniciou a preparação da sessão Stripe sandbox sem concluir pagamento.

O primeiro teste de criação de sessão Stripe revelou um erro de inserção nas linhas de encomenda porque os IDs Shopify reais excedem o limite de `INT`. A coluna foi corrigida para `BIGINT UNSIGNED`, a migração foi aplicada com sucesso e o TypeScript/build continuam válidos.

O segundo teste criou uma sessão Stripe sandbox e redirecionou corretamente para `checkout.stripe.com`. A página Stripe mostrou o produto real, o email de teste, destinos europeus incluindo Portugal, portes “Entrega Europa” e o total de 27,38 €. Não foram introduzidos dados de cartão nem concluído pagamento.

A suíte Vitest final passou: 3 ficheiros e 9 testes, incluindo autenticação, cálculo server-side, regra SF10, evento Stripe de teste, `checkout.session.completed`, `checkout.session.expired` e ordem do webhook antes do parser JSON. A build TypeScript e de produção também passou. A base de dados confirmou 1 encomenda e 1 linha de produto para a sessão sandbox criada.

Correção de descontos validada: o catálogo aplica uma taxa determinística entre 20% e 50% a todas as variantes, incluindo as 671 fichas de produto que não tinham `compare_at_price`. A captura completa da homepage mostra badges de desconto e preço original riscado nos cartões. Os testes agora passaram com 10 testes.

A validação textual do catálogo confirmou, após a correção, percentagens visíveis -20%, -25%, -30%, -35%, -40%, -45% e -50% nos produtos da primeira página, incluindo anteriormente sem desconto. O detalhe de produto ainda será reaberto após atualizar o snapshot do browser.

O detalhe de produto foi validado no browser: a T-Shirt The North Face, que tinha `compare_at_price` vazio no catálogo original, aparece com preço promocional de 22,39 €, preço original de 44,78 € riscado e indicação “50% de desconto”.

Após alinhar `pick(p)` com `selectedVariant`, a grelha e o detalhe do mesmo produto passam a mostrar exatamente `-50%`, preço promocional de 22,39 € e preço original de 44,78 €. A divergência anterior entre `-40%/37,32 €` e `-50%/44,78 €` foi corrigida.

A variante do detalhe foi adicionada ao carrinho e manteve o preço promocional de 22,39 € por unidade; com duas unidades, o subtotal mostrado foi 44,78 € e o total com portes foi 49,77 €. Isto confirma coerência entre grelha, detalhe e carrinho.

O checkout Stripe sandbox foi iniciado novamente com a mesma variante e email. A Stripe mostrou 2 unidades a $26,99 cada, subtotal €49,77 no seletor de moeda equivalente a 53,98 $, portes “Entrega Europa” de 6,01 $ equivalentes a 4,99 €, confirmando que o preço promocional e os portes enviados correspondem ao carrinho. Não foi concluído pagamento.

Após a alteração do carrinho, a homepage reaberta continuou a mostrar percentagens e preços originais em todos os cartões visíveis. O browser ficou indisponível ao tentar reabrir o painel do carrinho, por isso a presença da nova linha promocional no painel foi validada pelo código e pela build, mas não por uma captura visual adicional nesta sessão.

Validação visual do carrinho concluída após reinício: a linha da T-Shirt The North Face mostra preço promocional de 22,39 €, indicação de `-30%` e preço original riscado de 31,99 €. O subtotal de 44,78 €, portes de 4,99 € e total de 49,77 € continuam visíveis.

Após a normalização do localStorage, a validação visual definitiva confirmou os mesmos valores nas três vistas para a T-Shirt The North Face Crop S/S Essential: grelha `-50%`, 22,39 € e 44,78 € original; detalhe `-50%`, 22,39 € e 44,78 € original; carrinho `-50%`, 22,39 € e 44,78 € original. A causa era uma linha persistida de uma versão anterior com `-30%` e 31,99 €.

A reprodução confirmou que as três barras abrem corretamente. Antes da correção, o clique em Running resultava em grelha vazia porque o catálogo não tinha tags literais dessas modalidades. Depois do mapeamento server-side por palavras reais, Running passou a mostrar 145 produtos; o primeiro cartão foi Nike Star Runner Utility com `-45%`.

A validação do menu confirmou: Futebol devolve produtos reais, incluindo chuteiras e equipamento Nike/Adidas; Fitness devolve produtos reais, incluindo sacos, roupa, fatos de treino e calçado. A correção de filtragem por palavras reais está a funcionar no preview.

A validação final confirmou que Basquetebol devolve 3 produtos reais no catálogo, e o menu superior das três barras passou a apresentar as oito opções: Todos os produtos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol.

Validação visual adicional: ao abrir as três barras, aparecem Todos os produtos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol. A opção Basquetebol, selecionada diretamente no menu superior, fecha o menu e deixa a coleção filtrada com 3 produtos reais.

## Correção do menu superior — validação final

O problema era duplo: as modalidades não existiam como tags literais no catálogo e o menu superior não incluía todas as categorias. A filtragem passou a usar palavras reais nos títulos, tipos e tags do catálogo. Running devolve 145 produtos, Futebol 154, Fitness 48 e Basquetebol 3. O menu das três barras mostra Todos os produtos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol. Foi confirmado no browser que a seleção fecha o menu e atualiza a coleção; a versão mobile mantém o botão acessível e a grelha responsiva. TypeScript, 11 testes Vitest e build de produção concluídos com sucesso.

Teste funcional automático do menu superior: os oito botões foram clicados com sucesso e produziram os títulos esperados — Todos os produtos → Todos os produtos; Homem → Homem; Mulher → Mulher; Criança → Criança; Running → Running; Futebol → Futebol; Fitness → Fitness; Basquetebol → Basquetebol.

Validação visual do detalhe de calçado: a chuteira New Balance Furon Elite FG V9 mostra as opções 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45 e 46. O tamanho 46 foi selecionado com sucesso no detalhe.

Validação do carrinho: a chuteira New Balance Furon Elite FG V9 foi adicionada com o tamanho 46 selecionado. O painel mostra a linha com “Tamanho 46”, preservando o preço promocional e o total calculado.

Validação final do detalhe de calçado após a correção estrutural: a lista aparece como um único controlo 35–46. No produto real “Chuteiras New Balance Furon Elite FG V9”, os tamanhos 40, 40.5, 41.5, 42, 42.5, 43, 44, 44.5 e 45 correspondem a variantes reais e os botões 35, 36, 37, 38, 39 e 46 ficam desativados por não existirem nesse produto. A seleção não permite combinar uma cor/variante com um tamanho inexistente.

Validação final dos tamanhos reais: TypeScript sem erros; 13 testes Vitest aprovados; build de produção concluída. O produto real “Chuteiras New Balance Furon Elite FG V9” apresenta a grelha única 35–46, ativa apenas os números correspondentes a variantes reais disponíveis, desativa os restantes e guarda “Tamanho 46” quando uma variante real é escolhida. O servidor rejeita tamanhos ausentes ou combinações incompatíveis antes de criar a sessão Stripe.

Revisão final em 31/08/2026: homepage abriu no preview com 6.118 produtos e descontos visíveis; o menu superior abriu corretamente e mostrou as oito opções Todos os produtos, Homem, Mulher, Criança, Running, Futebol, Fitness e Basquetebol. Os filtros e os cartões de produto permaneceram renderizados.

Revisão final do catálogo: o menu superior filtrou Running para produtos reais; a abertura de “Sapatilhas Nike Star Runner Utility” apresentou imagem, preço promocional, preço original, desconto de 45% e a seleção única de tamanhos 35–46.

Revisão final do carrinho: o produto Running foi adicionado com a variante e tamanho selecionados; o painel mostra a linha da encomenda, preço promocional, preço original, subtotal, portes Europa 4,99 €, total, campo SF10, email de pagamento e botão de finalização Stripe.

Revisão final do cupão: no carrinho, `SF10` foi aceite e mostrou o desconto de 10%; o subtotal e o total foram recalculados, mantendo os portes Europa fixos de 4,99 €. O fluxo não concluiu pagamento real.

A revisão final confirmou que o carrinho aceita o código `SF10`, recalcula o desconto de 10% e mantém os portes de 4,99 €. A linha adicionada mantém produto, variante e tamanho escolhidos.

A pesquisa “Nike” devolve resultados reais. Na pesquisa deliberadamente inexistente `zzzz-produto-inexistente`, a grelha ficou vazia, mas o preview não apresentou uma mensagem clara de “sem resultados”; esta melhoria foi identificada para a versão final.

A pesquisa por texto foi confirmada com resultados reais e o estado vazio do carrinho foi testado após limpar temporariamente o armazenamento: o painel apresentou corretamente “O teu carrinho está vazio.”. O carrinho original foi preservado no backup do preview para reposição posterior.

Depois do teste de estado vazio, o carrinho persistente foi restaurado e o contador voltou a mostrar os itens guardados. O preview continua a renderizar o catálogo completo e os descontos.

O carrinho restaurado apresentou os produtos persistentes e os totais. Foi introduzido um cupão inválido (`ERRADO10`) para validar a rejeição sem desconto; o total permaneceu inalterado antes da ação de aplicar.

Na versão final compilada, a pesquisa `zzzz-produto-inexistente` apresenta o estado vazio explícito “Sem resultados / Não encontrámos essa seleção.” com botão “Ver toda a coleção”. A consola do preview não apresenta erros ativos de runtime.

A validação final do checkout com email vazio foi executada no preview: o fluxo não cria sessão Stripe e apresenta a mensagem de erro “Indica um email válido.”. O cupão inválido também foi rejeitado sem alterar o total.

Diagnóstico da correção solicitada: o catálogo tinha 3.384 artigos de calçado e nenhum disponibilizava simultaneamente todos os tamanhos 35–46, porque as variantes originais estavam ausentes ou marcadas como indisponíveis. Foi criada uma normalização server-side e no carrinho persistente que preserva as variantes reais e completa os tamanhos em falta com variantes selecionáveis baseadas no preço, cor e promoção do próprio artigo. No detalhe de “Chuteiras New Balance Furon Elite FG V9”, os 12 botões 35–46 foram confirmados ativos no DOM; o tamanho 35 foi selecionado e adicionado ao carrinho com sucesso. A mensagem anterior “Os tamanhos sem stock estão desativados.” foi substituída por “Todos os tamanhos 35–46 estão disponíveis para seleção.”. Testes Vitest (14) e build de produção passaram.

Foi também validado server-side um checkout de teste com o produto real “Chuteiras New Balance Furon Elite FG V9”, variante normalizada do tamanho 35 e quantidade 1: `calculatePriceCents` aceitou a seleção e devolveu exatamente o preço do catálogo. A nova cobertura Vitest confirma ainda que o tamanho 46 é selecionável, que variantes geradas ficam disponíveis e que combinações com tamanho incorreto continuam rejeitadas.

A validação integrada de `checkout.createSession` passou com Stripe e base de dados simulados: a mutation aceitou a variante normalizada 35, calculou o total server-side com portes, criou o line item com “Tamanho 35” e persistiu a encomenda pendente e a linha correspondente. Não foi efetuado qualquer pagamento real.
