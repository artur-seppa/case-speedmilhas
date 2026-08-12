# Desafio Técnico — Dev Full Stack Pleno · Speed Milhas

A Speed Milhas é uma plataforma B2B de emissão de passagens aéreas com milhas. Boa parte do
nosso trabalho é conversar com fornecedores externos que são lentos, instáveis e cada um com
seu próprio formato de resposta — e ainda assim entregar uma tela que responde rápido e não
vende duas vezes o mesmo assento.

Este desafio é uma versão reduzida desse problema.

**O que estamos avaliando:** como você lida com integração externa instável, concorrência e
decisões sob restrição de tempo. Não é um teste de CRUD.

| Item | Detalhe |
|---|---|
| Prazo de entrega | 7 dias corridos a partir da data em que você recebeu o desafio |
| Entrega | Link do repositório **público** no [formulário de entrega](https://forms.gle/8f2zR814aMRHTDhE6), com o `DECISIONS.md` preenchido |
| Stack | NestJS + Prisma + Next.js + TypeScript |

---

## 1. Subindo o ambiente

**Pré-requisitos:** Docker (com Compose) e Node.js 20 ou superior — recomendamos a linha LTS 24.

### Infraestrutura (banco + fornecedores mock)

```bash
cp .env.example .env
docker compose up -d
```

Isso sobe o PostgreSQL na porta `5432` e o serviço `mock-suppliers` na porta `4000`.
Confira que subiu:

```bash
curl http://localhost:4000/health      # {"status":"ok"}
docker compose ps                      # os dois devem estar "healthy"
```

> **Porta ocupada?** Se você já tem um Postgres ou algo na `4000` rodando na sua máquina,
> mude `POSTGRES_PORT` / `MOCK_SUPPLIERS_PORT` no `.env` e ajuste `api/.env` na mesma medida.

### API (NestJS)

```bash
cp api/.env.example api/.env
cd api
npm install
npm run prisma:generate      # obrigatório antes do primeiro start
npm run start:dev            # http://localhost:3000
```

### Web (Next.js)

```bash
cp web/.env.example web/.env
cd web
npm install
npm run dev                  # http://localhost:3001
```

O **Tailwind v4** já vem configurado (`postcss.config.mjs` + `app/globals.css`) — o
`npm install` traz tudo, não precisa rodar nenhum init. Se a página inicial abrir com margem
e texto cinza, o pipeline de CSS está funcionando.

As variáveis de `api/.env` são carregadas por `dotenv` no `src/main.ts`. Se você preferir
`@nestjs/config`, fique à vontade para trocar.

### Portas

| Serviço | Porta | Onde roda |
|---|---|---|
| `web` | 3001 | seu host, via npm |
| `api` | 3000 | seu host, via npm |
| `mock-suppliers` | 4000 | Docker |
| PostgreSQL | 5432 | Docker |

A `api` e o `web` rodam fora do Docker de propósito: o hot reload fica muito melhor assim.
O `docker compose` cuida só do que é infraestrutura.

---

## 2. Os fornecedores

Três fornecedores, servidos pelo `mock-suppliers` em `http://localhost:4000`.
Eles se comportam mal **de propósito** — é esse o exercício.

| | Latência | Falha | Formato |
|---|---|---|---|
| **A** | 100–800 ms | 5% de erro 500 | `{ miles, taxes_brl, carrier }` |
| **B** | 1–5 s | 20% de erro 500 · rate limit 5 req/s → 429 | `{ pontos, taxa: { valor, moeda }, cia }` |
| **C** | rápido | 10% das respostas vêm sujas | `{ price_miles, fee, airline_code }` |

**Aeroportos atendidos:** `GRU`, `GIG`, `BSB`, `SSA`, `REC`, `POA`, `CNF`, `FOR`
**Companhias:** LATAM (`LA`), GOL (`G3`), AZUL (`AD`)

O catálogo é **determinístico**: a mesma rota e a mesma data devolvem sempre os mesmos preços.
O que varia entre chamadas é o comportamento — latência, erro, sujeira.

### Fornecedor A

```http
GET /supplier-a/quotes?origin=GRU&destination=GIG&date=2026-08-15
```

```json
{
  "results": [
    { "miles": 18500, "taxes_brl": 75.51, "carrier": "GOL" },
    { "miles": 22000, "taxes_brl": 98.36, "carrier": "LATAM" }
  ]
}
```

### Fornecedor B

Note os nomes dos parâmetros: `from`, `to`, `day`.

```http
GET /supplier-b/search?from=GRU&to=GIG&day=2026-08-15
```

```json
{
  "dados": [
    { "pontos": 16000, "taxa": { "valor": 167.99, "moeda": "BRL" }, "cia": "AZUL" }
  ]
}
```

Ao estourar 5 requisições por segundo, responde `429` com o header `Retry-After: 1`.

### Fornecedor C

`POST` com body JSON, e usa o **código IATA** da companhia em vez do nome.

```http
POST /supplier-c/v2/quotes
Content-Type: application/json

{ "origin": "GRU", "destination": "GIG", "date": "2026-08-15" }
```

```json
{
  "data": [
    { "price_miles": 17500, "fee": 55.79, "airline_code": "LA" },
    { "price_miles": 22500, "fee": 155.7, "airline_code": "AD" }
  ]
}
```

Em 10% das respostas, uma destas três coisas acontece — sem erro HTTP, status 200:

- algum campo vem `null` (ex.: `"fee": null`)
- `price_miles` vem como string (`"17500"`)
- `data` vem como array vazio

---

## 3. Controlando o caos — endpoints `/admin`

Você não precisa ficar na mão do acaso para testar cenários ruins. O mock aceita comandos:

```bash
# 100% de falha em um fornecedor
curl -X POST http://localhost:4000/admin/force-fail/supplier-b

# latência fixa de 8 segundos (acima do seu teto de 6s)
curl -X POST http://localhost:4000/admin/force-slow/supplier-b

# força o payload sujo do fornecedor C (sorteia qual das três sujeiras)
curl -X POST http://localhost:4000/admin/force-dirty/supplier-c

# ...ou fixa uma delas, para testar um caso específico
curl -X POST "http://localhost:4000/admin/force-dirty/supplier-c?mode=empty"
curl -X POST "http://localhost:4000/admin/force-dirty/supplier-c?mode=null"
curl -X POST "http://localhost:4000/admin/force-dirty/supplier-c?mode=string"

# volta ao comportamento padrão e zera os contadores
curl -X POST http://localhost:4000/admin/reset

# quantas chamadas cada fornecedor recebeu
curl http://localhost:4000/admin/stats
```

Aceita `supplier-a` ou só `a`.

Os três valores de `mode` são as três sujeiras da seção anterior: `empty` devolve `data: []`,
`null` anula um campo, `string` manda `price_miles` como texto. Com o modo fixo o cenário é
reprodutível — dá para escrever um teste em cima dele em vez de esperar o sorteio.

`/admin/stats` conta cada chamada recebida, separando `ok`, `errors`, `rateLimited` e `dirty`
(com `dirtyModes` detalhando qual sujeira caiu). É uma boa forma de conferir se o seu código
está chamando os fornecedores o número de vezes que você acha que está.

> **Não altere o `mock-suppliers/`.** Ele é o enunciado, não a solução. Nós avaliamos o seu
> código rodando contra esse mock exatamente como ele está aqui.

---

## 4. O que construir

### RF1 — Busca agregada

`POST /search` recebe origem, destino e data. Consulta os três fornecedores, normaliza os
formatos e devolve as melhores opções ordenadas por milhas.

- A resposta **nunca pode passar de 6 segundos**, mesmo com o fornecedor B lento.
- Se um fornecedor falhar, retornar **resultado parcial**, indicando quais responderam e
  quais não.

### RF2 — Reserva idempotente

`POST /orders` com `{ quoteId, passageiro, idempotencyKey }`.

- Duas requisições **simultâneas** com a mesma chave geram **uma única reserva**, e ambas
  recebem a mesma resposta.
- Precisa funcionar com **duas instâncias da aplicação em paralelo** — mapa em memória não
  resolve.

Para subir a segunda instância, use outra porta:

```bash
cd api
PORT=3010 npm run start:dev
```

### RF3 — Tela de busca (Next.js)

Formulário de origem, destino e data, consumindo o `POST /search`.

A pergunta que interessa: **o `/search` pode voltar parcial. Como você comunica isso a quem
está usando?** Quais estados existem além de carregando / erro / sucesso? Mostra o que chegou
ou espera tudo? Como sinalizar que a lista está incompleta sem assustar?

**Estilize a tela de resultados.** O **Tailwind v4 já vem configurado** no esqueleto — não
precisa instalar nem inicializar nada, só usar as classes.

Não esperamos design de produto nem tela pixel-perfect. Esperamos uma lista de resultados
legível: hierarquia visual clara entre as opções, o preço em milhas fácil de comparar entre
elas, e o aviso de resultado parcial visível sem precisar procurar. Se você usar outra
abordagem de CSS em vez do Tailwind, sem problema — o que avaliamos é o resultado na tela.

### RF4 — Teste de concorrência

Um teste que prove o RF2, disparando as duas requisições de verdade. **Obrigatório.**

O Jest já está configurado no `api` — tem um teste trivial em `src/app.module.spec.ts` que
passa, só para você não perder tempo com setup. Pode apagá-lo.

```bash
cd api && npm test
```

### RF5 — `DECISIONS.md`

Quatro perguntas, na raiz do repositório. Não é texto livre — responda as quatro.
O arquivo já está lá, em branco.

---

## Bônus

Cache nas buscas repetidas · circuit breaker no fornecedor B · um segundo teste cobrindo a
falha parcial do RF1 · log estruturado por fornecedor · paginação.

> **Bônus não somam pontos.** Só elevam a qualidade do que já existe, quando bem feitos.
> Um bônus meia-boca conta menos que um requisito bem resolvido.

## Fora de escopo

Autenticação · deploy · CI/CD · painel administrativo · cadastro manual de cotações ·
responsividade mobile e acessibilidade além do básico.

---

## Prazo

**7 dias corridos a partir da data em que você recebeu o desafio.** É o único limite: não
estipulamos teto de horas.

Se você decidir cortar escopo, diga no `DECISIONS.md` o que ficou faltando e como faria.
**Isso conta a favor, não contra** — priorizar é parte do trabalho e está sendo observado.

## Uso de IA

**Liberado.** A Speed usa IA no dia a dia; não faz sentido pedir que você trabalhe diferente.

Única exigência: **declarar como usou**, na pergunta 3 do `DECISIONS.md` — quais ferramentas,
com que método, e um ponto onde você discordou dela.

Não descontamos ponto por uso de IA em nenhuma hipótese.

---

## Entrega

1. Suba o código em um repositório Git **público** (GitHub, GitLab, Bitbucket — tanto faz).
2. Preencha o **`DECISIONS.md`** na raiz.
3. Envie o link do repositório no formulário de entrega:
   **https://forms.gle/8f2zR814aMRHTDhE6**

Commits pequenos ao longo do caminho ajudam mais que um commit único no final.

Boa sorte — e qualquer coisa que travar no ambiente, avise. Ambiente quebrado é problema
nosso, não seu.
