# DECISIONS

Quatro perguntas. Responda todas — é aqui que a gente entende as suas escolhas, e cada
resposta vira conversa na entrevista.

Objetividade vale mais que volume. Duas frases boas batem dois parágrafos genéricos.

---

## 1. O que acontece quando o fornecedor B demora 8 segundos?

E por que você escolheu essa estratégia e não outra?

`fetchWithTimeout` corta a chamada num `AbortSignal.timeout` calculado a partir de um
deadline compartilhado (`SEARCH_BUDGET_MS = 5500ms`), não de um timeout fixo por
fornecedor — assim os 6s do RF1 valem para a busca inteira, não para cada chamada
isolada. Se o B estoura, a chamada é abortada e vira `SupplierTimeoutError`;
`Promise.allSettled` captura essa rejeição sem travar as respostas de A e C, e o `/search`
devolve resultado parcial marcando `supplier-b` como `failed`/`timeout` dentro do teto.

Escolhi orçamento compartilhado em vez de timeout fixo por fornecedor porque o requisito
é sobre o tempo total da resposta ao cliente, não sobre cada chamada individual — com
timeout fixo por fornecedor (ex.: 2s cada) eu arriscaria ou estourar os 6s totais quando
vários fornecedores demoram um pouco, ou desperdiçar orçamento em fornecedores rápidos.
O único retry existente (fornecedor B, em 429/500) também respeita esse mesmo deadline:
só re-tenta se ainda sobrar tempo, senão desiste e conta como falha.

---

## 2. Como você garante uma única reserva sob concorrência?

E o que quebra se subirem três instâncias da aplicação?

`idempotencyKey` é `UNIQUE` na tabela `Order` (Postgres via Prisma) — toda requisição
tenta um `INSERT` direto. Se colidir (`P2002`), a transação que colidiu só pode estar
vendo esse erro porque a outra já commitou (é assim que o índice único do Postgres se
comporta sob concorrência: a segunda transação bloqueia até a primeira resolver, e só
falha se a primeira de fato foi commitada) — então a "perdedora" simplesmente lê essa
linha (`findUniqueOrThrow` pela chave) e devolve como resposta, sem lock explícito.

Nada quebra com três instâncias, porque a garantia de atomicidade vive no Postgres, não
na memória de nenhum processo — é exatamente o cenário que um `Map` em memória não
resolveria (cada instância teria seu próprio mapa, cego pras outras). Descartei lock
pessimista (`SELECT ... FOR UPDATE`) porque ele precisa de uma linha já existente pra
travar, e na primeira requisição de uma chave nova não existe linha nenhuma ainda.

---

## 3. Como você usou IA?

Quais ferramentas (Claude Code, Codex, Cursor, ChatGPT…), com que método (spec-driven, TDD
com agente, pair, revisão) — e **um ponto concreto onde você discordou dela** e seguiu por
outro caminho.

Claude Code, do começo ao fim. RF2 seguiu um fluxo spec-driven completo (brainstorming →
spec escrita → plano de implementação → execução task-a-task por subagentes, cada um com
TDD e revisão de código antes do próximo) — RF1 e os ajustes pontuais foram mais
conversacionais, e o RF3 saiu num modo mais direto por causa do prazo apertado no fim.

Ponto concreto de discordância: pra validar se uma data de busca já passou, a IA propôs
calcular "hoje no Brasil" subtraindo manualmente 3 horas de `Date.now()` — um truque de
offset fixo. Não aceitei: perguntei se é assim que sistemas de verdade fazem isso, porque
não usa a base de fusos IANA e quebraria se o Brasil um dia voltar a ter horário de verão.
A IA trocou pra `Intl.DateTimeFormat` com fuso `America/Sao_Paulo`, que é a API nativa do
Node pra isso — sem dependência nova, correto independente de mudanças futuras de DST.

---

## 4. Quanto tempo você demorou para concluir o desafio?

Pelos timestamps de commit, do primeiro commit ao último foram cerca de 12h corridas num
único dia (10:38 às 22:59) — isso inclui pausas, não é tempo efetivo contínuo de trabalho.
