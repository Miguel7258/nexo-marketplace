# Nexo — protótipo de marketplace tecnológico

## Objetivo e limites

Protótipo navegável de marketplace multivendedor, em português de Portugal e euros. Nexo é o nome provisório; Vendra e Montra são alternativas. Marca e domínio não foram verificados.

O catálogo é a superfície inicial. Inclui pesquisa, filtros por categoria e preço, ordenação, detalhes de produto, ofertas de várias lojas, carrinho agrupado por vendedor, compra simulada e área de vendedor para gerir ofertas e consultar encomendas demonstrativas.

Sem pagamentos reais, autenticação, integrações com lojas, faturação, comissões, servidor ou publicação pública. A seleção de vendedor é uma simulação, não um mecanismo de segurança. Identificar o ambiente como demonstração e não recolher dados pessoais reais.

## Base técnica e visual

React, TypeScript, Vite, React Router e CSS com variáveis partilhadas. Usar npm e preservar o lockfile após a instalação inicial. Escolher versões estáveis compatíveis ao implementar; registar scripts no manifesto, sem os duplicar nesta documentação.

Fundo claro, azul-escuro e apontamentos elétricos; identidade própria, sem copiar a marca Worten. Interface responsiva, controlos com nomes acessíveis, foco visível e navegação por teclado. Imagens de produto coerentes, com texto alternativo e origem/licença adequada; não inventar URLs de imagens.

Estado demonstrativo em localStorage, através de uma única camada de acesso a dados substituível por API. Disponibilizar reposição dos dados iniciais. Dados locais inválidos devem produzir recuperação compreensível, sem bloquear a aplicação.

## Modelo inicial

Estes conceitos orientam a primeira implementação; depois, os tipos no código são a fonte de verdade dos campos e assinaturas.

| Entidade | Responsabilidade |
| --- | --- |
| Product | Identidade, categoria, características e imagem |
| Seller | Identidade e nome da loja |
| Offer | Produto, vendedor, preço inteiro em cêntimos e stock |
| CartItem | Referência à oferta e quantidade |
| DemoOrder | Cópia dos artigos comprados, preços e vendedores, agrupados por loja |

Um produto pode ter ofertas de várias lojas. O carrinho identifica ofertas, não apenas produtos. Alterações posteriores a uma oferta não alteram o histórico de encomendas. Revalidar preço e stock antes de concluir uma simulação; se houver incompatibilidade, atualizar o carrinho e informar o utilizador antes de concluir. Uma compra válida reduz stock e cria uma encomenda uma única vez.

Dados iniciais: 12 produtos, três lojas fictícias e quatro categorias — computadores, smartphones, áudio e acessórios. Incluir produtos com ofertas concorrentes e encomendas demonstrativas para a área do vendedor.

## Fase 1 — Base e catálogo

Pré-requisito: pacote de planeamento disponível; implementação autorizada.

Criar a base técnica, tema, navegação, modelo, camada de dados e dados iniciais. Rotas: `/` para catálogo e `/produto/:productId` para detalhes. Pesquisa pelo nome; filtros combináveis por categoria e preço; ordenação por nome e preço ascendente/descendente. No catálogo, usar o menor preço entre ofertas disponíveis; mostrar indisponibilidade quando nenhuma tiver stock. Detalhes mostram características, vendedor, preço e stock de cada oferta.

Aceitação: encontrar um produto, combinar filtros, ordenar e abrir detalhes; pesquisa sem correspondências apresenta estado vazio com opção para limpar filtros; produto inexistente apresenta mensagem e regresso ao catálogo. Demonstrar que um produto apresenta ofertas de duas lojas. Verificar renderização básica em desktop e 360 px.

Entrega: catálogo navegável e estado atualizado com caminhos dos tipos, dados e scripts disponíveis.

## Fase 2 — Compra simulada

Pré-requisito: fase 1 concluída e validada.

Adicionar `/carrinho`, seleção de oferta nos detalhes, alteração de quantidades, remoção, grupos por vendedor, subtotais e total em euros. Concluir sem dados pessoais ou pagamento; apresentar confirmação inequívoca de simulação. Persistir carrinho, stock e encomendas e permitir repor toda a demonstração.

Aceitação: comprar artigos de duas lojas na mesma simulação; carrinho vazio, oferta esgotada e quantidades acima do stock têm tratamento explícito. Totais usam cêntimos inteiros. Compra atualiza stock, regista os artigos e esvazia o carrinho; cliques repetidos não duplicam a encomenda. Recarregar preserva os dados. Repor restaura o estado inicial.

Entrega: percurso catálogo → produto → carrinho → confirmação; testes automatizados para totais e limites de stock.

## Fase 3 — Vendedor

Pré-requisito: fase 2 concluída e validada.

Adicionar `/vendedor` com seleção entre as três lojas fictícias. Criar ofertas para produtos existentes e editar preço e stock das ofertas da loja selecionada; impedir ofertas duplicadas para o mesmo par loja/produto. Validar preço positivo e stock inteiro não negativo. Mostrar apenas os artigos das encomendas que pertencem à loja selecionada. Criar produtos novos fica fora desta fase.

Aceitação: editar uma oferta e observar o novo valor no catálogo após navegação/recarregamento; preservar ofertas das outras lojas e cópias históricas das encomendas. Uma oferta criada aparece no produto correto. Testar stock reduzido com artigo já no carrinho e a revalidação na compra.

Entrega: percurso vendedor → editar/criar oferta → catálogo; validação de isolamento entre lojas demonstrativas.

## Fase 4 — Validação e entrega local

Pré-requisito: fases 1–3 implementadas.

Verificar os critérios das fases anteriores, navegação por teclado, nomes acessíveis, foco e ecrã de 360 px sem corte ou scroll horizontal indevido. Executar build, verificação de tipos e testes de totais/stock. Usar os scripts reais do projeto; documentar os passos de instalação e execução local após estes existirem.

Aceitação: percursos de compra multiloja, gestão de oferta, persistência e reposição observados; verificações automáticas sem erros. Se não houver ferramenta de navegador, assinalar os cenários visuais como pendentes, sem declarar validação completa.

Entrega: instruções locais e resumo breve de alterações, evidência e limitações. Sem publicação.
