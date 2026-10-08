# Nexo — marketplace de tecnologia

Protótipo demonstrativo em React, TypeScript e Vite, com catálogo multivendedor,
carrinho, compra simulada e gestão de ofertas por loja. Português de Portugal.

## Executar localmente

No Windows, abrir `Ver-Site.bat`. Em alternativa:

```sh
npm ci
npm run dev
```

## Verificar

```sh
npm test
npm run build
```

## GitHub Pages

O workflow `.github/workflows/pages.yml` testa, compila e publica a branch `main`.
Nas definições do repositório, selecionar **Pages → Source → GitHub Actions**.
O build publicado usa rotas com `#/` para permitir abrir e recarregar detalhes,
carrinho e vendedor diretamente no GitHub Pages. A execução local mantém as rotas habituais.

## Limites

Não há autenticação nem pagamentos reais. A escolha de vendedor é demonstrativa.
Dados, carrinho e encomendas ficam em `localStorage`, separados por navegador e
dispositivo; não são sincronizados. “Repor dados” restaura a demonstração desse navegador.
