# Nexo — Marketplace Tecnológico

## Instruções de Execução Local (Verificadas)

O protótipo foi testado e validado em ambiente Windows local com Node.js (v24.x) e npm.

### Arranque Rápido (Recomendado no Windows)
Executa o ficheiro de comandos [Ver-Site.bat](file:///c:/Users/Miguel/.gemini/antigravity/scratch/MarketPlace/Ver-Site.bat) (duplo clique no explorador de ficheiros ou via terminal):
```cmd
Ver-Site.bat
```
O script verifica a presença do Node.js/npm, instala automaticamente as dependências se a pasta `node_modules` não existir, inicia o servidor Vite em `http://127.0.0.1:5173/` e abre a aplicação no navegador padrão. Mantém a janela do terminal aberta enquanto utilizas o site e prime `Ctrl+C` para encerrar.

### Execução Manual por Linha de Comandos
Em alternativa, utiliza os scripts npm registados no manifesto `package.json`:

```bash
# 1. Instalar as dependências do projeto (mantendo o package-lock.json)
npm install

# 2. Iniciar o servidor de desenvolvimento
npm run dev

# 3. Validar a compilação de tipos e gerar o pacote de produção
npm run build

# 4. Pré-visualizar o pacote de produção compilado (porta 4173)
npm run preview

# 5. Executar a suite de testes unitários e de integração (44 testes)
npm test

# 6. Executar a suite de validação em navegador real via Chrome Headless / CDP (41 verificações)
node scripts/verify-phase4-browser.mjs
```

---

## Limites e Âmbito do Protótipo

Conforme definido em `docs/PLAN.md`, este projeto é um protótipo navegável em ambiente demonstrativo:

- **Sem serviços nem transações reais**: Não inclui cobrança bancária, cartões de crédito, faturação, taxas, comissões de loja nem envio físico de encomendas.
- **Sem autenticação nem segurança de backend**: A seleção de vendedor entre as três lojas parceiras (`TechNorte`, `ByteZone` e `GadgetHub`) na rota `/vendedor` é uma simulação de papéis comerciais, não um sistema seguro de controlo de acessos ou login real.
- **Dados demonstrativos e privacidade**: A aplicação opera integralmente no lado do cliente. Não recolhe, processa nem envia dados pessoais reais para servidores externos.
- **Persistência local e reposição imediata**: Todo o estado (catálogo, ofertas, stock, carrinho e encomendas) é mantido em `localStorage` no browser através de um snapshot unificado (`nexo_marketplace_snapshot_v1`). A barra de navegação disponibiliza o botão **«Repor dados»** para restaurar integralmente o estado demonstrativo original a qualquer momento.
- **Ambiente de demonstração**: Todas as páginas apresentam avisos claros identificando o contexto como protótipo tecnológico demonstrativo.

---

## Utilização no Antigravity

Abre esta pasta como workspace. Os agentes personalizados estão em `.agents/agents/`, em Markdown com YAML front matter; cada um referencia uma skill em `.agents/skills/`. As regras comuns estão em `AGENTS.md` e não precisam de front matter.

| Agente | Skill |
| --- | --- |
| `marketplace-planner` | `marketplace-plan` |
| `marketplace-builder` | `marketplace-build` |
| `marketplace-validator` | `marketplace-check` |

A documentação de custom subagents indica suporte no Antigravity 2.0 e CLI. No CLI, seleciona o agente em `/agents`; não pressupor suporte idêntico em todas as versões do IDE. `model: inherit` mantém o modelo escolhido na sessão. Os agentes ficam disponíveis, mas não são iniciados por estes ficheiros.

Usa uma sessão por fase quando o contexto anterior deixar de ser útil. Executa os papéis sequencialmente: planeador → implementador → validador. Transmite apenas a tarefa delimitada e os caminhos; o estado partilhado substitui o histórico.

### Referências de Formato
Referências oficiais: [custom subagents](https://antigravity.google/docs/subagents?tab=cli), [rules](https://www.antigravity.google/docs/rules/) e [skills](https://www.antigravity.google/docs/skills?tab=ide). A economia de tokens depende do modelo e da execução; não foi medida.

