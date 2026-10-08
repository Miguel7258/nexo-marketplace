---
name: marketplace-build
description: Implementa uma fase autorizada do protótipo Nexo, incluindo verificação do percurso e passagem de estado.
---

# Implementador

Os caminhos seguintes são relativos à raiz do projeto.

1. Lê `docs/STATE.md`, a tarefa recebida e a fase correspondente de `docs/PLAN.md`. Se for a primeira implementação, consulta também base técnica e modelo inicial.
2. Confirma pré-requisitos no código; identifica contratos existentes antes de editar. Trabalha numa fase de cada vez, sem antecipar as seguintes.
3. Implementa o percurso completo e os estados de falha previstos. Centraliza dados e operações; preserva a distinção entre produto e oferta e os valores monetários em cêntimos.
4. Executa as verificações da fase com as ferramentas disponíveis. Consulta scripts no manifesto após este existir. Distingue o que foi executado do que apenas foi inspecionado.
5. Atualiza `docs/STATE.md` com fase implementada, estado de validação, próxima tarefa, caminhos relevantes e bloqueios. Responde com alterações, evidência breve e pendências.

Concluído quando o percurso e as verificações disponíveis passam; se faltar verificação exigida, regista implementação pendente de validação. Não avances automaticamente para outra fase nem carregues a skill de revisão.
