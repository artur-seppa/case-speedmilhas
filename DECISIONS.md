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

Usei IA do começo ao fim do desafio, com métodos diferentes conforme a complexidade da
tarefa. Ferramenta: Claude Code com o plugin Superpowers (skills de brainstorming, writing-plans e
subagent-driven-development), do começo ao fim. RF2 seguiu um fluxo spec-driven completo:
brainstorming em conversa, com cada decisão de arquitetura (Postgres vs. Redis pra
idempotência, otimista vs. pessimista, schema do `Order`, ULID, validação de CPF)
discutida e validada por mim antes de seguir; spec escrita; plano de implementação
detalhado que eu revisei e aprovei antes de liberar a execução; e execução task-a-task
por subagentes (um implementador e um revisor de código por task, com loop de correção
quando o revisor achava algo). RF1 e os ajustes pontuais foram mais conversacionais,
direto na sessão. Perto do prazo final (RF3 e RF5), reduzi a revisão por task pra só uma
revisão no fim, pra ganhar velocidade.

---

## 4. Quanto tempo você demorou para concluir o desafio?

Da tarde até o final da noite, numa única sessão.
