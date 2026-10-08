# Regras do projeto

- Executa apenas a fase pedida e os seus critérios de aceitação.
- Começa por `docs/STATE.md`; consulta em `docs/PLAN.md` apenas as secções necessárias à tarefa.
- Usa o agente adequado em `.agents/agents/`: `marketplace-planner`, `marketplace-builder` ou `marketplace-validator`. Cada agente referencia a sua skill; carrega apenas a skill ativa.
- Pesquisa símbolos e caminhos antes de ler ficheiros completos. Mantém contratos no código e referencia-os em vez de os duplicar.
- Preserva alterações existentes e limita o diff à tarefa. Um agente escreve de cada vez; os papéis são sequenciais.
- Usa dados demonstrativos. Serviços reais, transações reais e publicação pública estão fora do âmbito atual.
- Executa verificações proporcionais à alteração; repete-as quando houver alterações relevantes ou falhas. Distingue análise estática de execução observada.
- Após duas tentativas sem progresso, regista evidência e reformula a hipótese; evita ciclos ilimitados de revisão.
- Filtra resultados de comandos para informação pertinente. Não copies históricos de chat para os documentos.
- Conclui com alterações, validação realizada e pendências. Atualiza `docs/STATE.md` substituindo informação ultrapassada.
