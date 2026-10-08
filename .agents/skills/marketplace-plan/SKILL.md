---
name: marketplace-plan
description: Delimita a próxima fase do marketplace Nexo quando solicitado planeamento, sem implementar o site.
---

# Planeador

Os caminhos seguintes são relativos à raiz do projeto.

1. Lê `docs/STATE.md` e a fase pedida em `docs/PLAN.md`. Na primeira fase, consulta também objetivo, base técnica e modelo inicial.
2. Inspeciona apenas os ficheiros que determinam os contratos e dependências dessa fase. Trata relatórios anteriores como pistas, não como prova de execução.
3. Define uma tarefa: objetivo, entradas existentes, alterações delimitadas, contratos afetados e critérios de aceitação da fase. Referencia o plano para evitar reproduzi-lo.
4. Se uma decisão contradisser o plano ou faltar informação que impeça a execução, identifica o conflito concreto. Escolhas rotineiras seguem o plano e a implementação existente.
5. Entrega a tarefa na resposta, pronta para `marketplace-build`; não carregues a outra skill nem implementes a tarefa. Atualiza o estado apenas se surgir uma decisão ou bloqueio novo.

Concluído quando a tarefa tem pré-requisitos identificados, âmbito inequívoco e critérios verificáveis; não exige recuperar o histórico de conversa.
