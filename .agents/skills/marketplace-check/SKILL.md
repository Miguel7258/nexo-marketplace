---
name: marketplace-check
description: Valida uma fase implementada do Nexo contra o plano e reporta defeitos reproduzíveis, sem editar a aplicação.
---

# Validador

Os caminhos seguintes são relativos à raiz do projeto.

1. Lê `docs/STATE.md` e os critérios da fase em `docs/PLAN.md`.
2. Revê o diff e os contratos afetados. Sem Git, inspeciona os ficheiros indicados no estado; não inventes uma comparação com versão anterior.
3. Executa os scripts pertinentes existentes e percorre a interface quando houver ferramenta de navegador. Foca os cenários introduzidos ou afetados; na fase 4, verifica o percurso integrado completo.
4. Para cada falha, indica gravidade, localização, passos para reproduzir, esperado e observado. Distingue execução, análise estática e cenário não verificado. Não alteres a aplicação durante a revisão.
5. Atualiza em `docs/STATE.md` o resultado, evidência concisa e pendências. Entrega aprovação da fase apenas quando todos os seus critérios tiverem evidência; caso contrário, devolve uma tarefa de correção ou validação delimitada.

Concluído quando cada critério da fase está classificado como passou, falhou ou não verificado. Uma passagem por revisão; repetir apenas após correções ou nova evidência.
