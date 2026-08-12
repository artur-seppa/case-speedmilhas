'use strict';

/**
 * mock-suppliers — três fornecedores de milhas que se comportam mal de propósito.
 *
 * Duas regras governam este arquivo:
 *
 *   1. O CATÁLOGO É DETERMINÍSTICO. A mesma rota + data devolve sempre os mesmos
 *      preços, em qualquer máquina, em qualquer execução. Não há banco nem estado:
 *      os preços são derivados por hash do (fornecedor, origem, destino, data).
 *      Dois candidatos rodando a mesma busca veem exatamente os mesmos números.
 *
 *   2. O MAU COMPORTAMENTO É ALEATÓRIO — mas controlável. Latência e falhas usam
 *      Math.random() para dar a sensação de instabilidade real. Quando você precisa
 *      de um cenário reprodutível, os endpoints /admin/* travam o comportamento.
 *
 * Não altere este arquivo. Ele é parte do enunciado, não da solução.
 */

const express = require('express');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);

// ---------------------------------------------------------------------------
// Catálogo determinístico
// ---------------------------------------------------------------------------

const AIRPORTS = ['GRU', 'GIG', 'BSB', 'SSA', 'REC', 'POA', 'CNF', 'FOR'];

const CARRIERS = [
  { name: 'LATAM', iata: 'LA' },
  { name: 'GOL', iata: 'G3' },
  { name: 'AZUL', iata: 'AD' },
];

/** Trocar este seed reescreve o catálogo inteiro. Não troque. */
const CATALOG_SEED = 'speedmilhas-desafio-pleno-v1';

/** Cada fornecedor precifica a mesma rota de forma diferente — senão não há o que comparar. */
const PRICE_FACTOR = { 'supplier-a': 1.0, 'supplier-b': 0.93, 'supplier-c': 1.07 };

/** xmur3 — string para semente de 32 bits. */
function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — PRNG determinístico a partir de uma semente. */
function prng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ofertas canônicas para (fornecedor, rota, data). Formato interno e neutro:
 * cada fornecedor traduz isto para o seu próprio contrato lá embaixo.
 */
function offersFor(supplier, origin, destination, date) {
  // A rota tem um preço-base próprio, simétrico entre ida e volta.
  const routeKey = [origin, destination].sort().join('-');
  const routeRand = prng(seedFrom(`${CATALOG_SEED}|route|${routeKey}`));
  const baseMiles = 9000 + Math.floor(routeRand() * 26000);

  const rand = prng(seedFrom(`${CATALOG_SEED}|${supplier}|${origin}|${destination}|${date}`));
  const count = 2 + Math.floor(rand() * 3); // 2 a 4 ofertas

  const offers = [];
  for (let i = 0; i < count; i++) {
    const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)];
    const jitter = 0.8 + rand() * 0.7;
    offers.push({
      carrier: carrier.name,
      iata: carrier.iata,
      miles: Math.round((baseMiles * PRICE_FACTOR[supplier] * jitter) / 500) * 500,
      taxesBrl: Math.round((38 + rand() * 180) * 100) / 100,
    });
  }
  return offers.sort((a, b) => a.miles - b.miles);
}

// ---------------------------------------------------------------------------
// Validação de entrada
// ---------------------------------------------------------------------------

/**
 * Devolve `{ value }` em caso de sucesso ou `{ error }` em caso de falha.
 * Os três fornecedores usam nomes de parâmetro diferentes, então quem chama
 * já passa os valores extraídos do lugar certo.
 *
 * A data é normalizada para YYYY-MM-DD antes de virar semente do catálogo —
 * sem isso, `2026-08-15` e `2026-08-15T00:00:00Z` gerariam preços diferentes.
 */
function normalizeQuery(origin, destination, date) {
  const o = String(origin ?? '').trim().toUpperCase();
  const d = String(destination ?? '').trim().toUpperCase();
  const raw = String(date ?? '').trim();

  if (!o || !d || !raw) {
    return { error: 'origin, destination e date são obrigatórios' };
  }
  if (!AIRPORTS.includes(o) || !AIRPORTS.includes(d)) {
    return { error: `aeroporto não atendido. Disponíveis: ${AIRPORTS.join(', ')}` };
  }
  if (o === d) {
    return { error: 'origin e destination devem ser diferentes' };
  }

  const match = /^\d{4}-\d{2}-\d{2}/.exec(raw);
  if (!match) {
    return { error: 'date deve estar no formato YYYY-MM-DD' };
  }

  return { value: { origin: o, destination: d, date: match[0] } };
}

// ---------------------------------------------------------------------------
// Estado de comportamento (controlado via /admin)
// ---------------------------------------------------------------------------

const SUPPLIERS = ['supplier-a', 'supplier-b', 'supplier-c'];

/** Latência padrão por fornecedor, em ms. */
const LATENCY = {
  'supplier-a': [100, 800],
  'supplier-b': [1000, 5000],
  'supplier-c': [15, 80],
};

/** Chance de responder 500 no comportamento padrão. */
const FAILURE_RATE = { 'supplier-a': 0.05, 'supplier-b': 0.2, 'supplier-c': 0 };

/** Chance de o fornecedor C devolver payload sujo. */
const DIRTY_RATE = 0.1;

/**
 * As três formas de sujeira do fornecedor C. No comportamento padrão o modo é sorteado;
 * `POST /admin/force-dirty/c?mode=empty` fixa um deles, para o cenário ser reprodutível
 * — sem isso não há como testar de propósito o caso do array vazio, que é o mais fácil
 * de tratar errado (200 sem erro e sem resultado nenhum).
 */
const DIRTY_MODES = ['empty', 'null', 'string'];

/** Latência aplicada por POST /admin/force-slow. Acima do teto de 6s do enunciado. */
const FORCED_SLOW_MS = 8000;

/** Rate limit do fornecedor B: 5 req/s por IP. Declarado aqui porque resetState() o limpa. */
const RATE_LIMIT = { max: 5, windowMs: 1000 };
const rateLimitHits = new Map();

const state = {};
resetState();

function resetState() {
  state.forceFail = new Set();
  state.forceSlow = new Set();
  // Map, não Set: guarda o modo de sujeira escolhido por fornecedor ('random' ou um de
  // DIRTY_MODES).
  state.forceDirty = new Map();
  state.since = new Date().toISOString();
  state.stats = {};
  for (const key of SUPPLIERS) {
    state.stats[key] = {
      calls: 0,
      ok: 0,
      errors: 0,
      rateLimited: 0,
      badRequest: 0,
      dirty: 0,
      // Qual sujeira caiu, quantas vezes. Ajuda a saber contra o que o candidato foi
      // exposto de fato — 10% aleatório às vezes não sorteia o modo que interessa.
      dirtyModes: { empty: 0, null: 0, string: 0 },
    };
  }
  rateLimitHits.clear();
}

/** Aceita `a`, `b`, `c` ou o nome completo `supplier-a`. */
function resolveSupplier(name) {
  const raw = String(name ?? '').trim().toLowerCase();
  const full = raw.startsWith('supplier-') ? raw : `supplier-${raw}`;
  return SUPPLIERS.includes(full) ? full : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function latencyFor(supplier) {
  if (state.forceSlow.has(supplier)) return FORCED_SLOW_MS;
  const [min, max] = LATENCY[supplier];
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shouldFail(supplier) {
  if (state.forceFail.has(supplier)) return true;
  return Math.random() < FAILURE_RATE[supplier];
}

/**
 * Qual sujeira aplicar nesta resposta — ou `null` para resposta limpa.
 *
 * Sem override, é o comportamento padrão: DIRTY_RATE de chance, modo sorteado. Com
 * override, suja sempre; e se o modo pedido foi específico, é esse modo, toda vez.
 */
function dirtyModeFor(supplier) {
  const forced = state.forceDirty.get(supplier);
  if (forced === undefined && Math.random() >= DIRTY_RATE) return null;
  if (forced && forced !== 'random') return forced;
  return DIRTY_MODES[Math.floor(Math.random() * DIRTY_MODES.length)];
}

// ---------------------------------------------------------------------------
// Rate limit — apenas o fornecedor B, 5 req/s por IP (janela deslizante)
// ---------------------------------------------------------------------------

function exceedsRateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT.windowMs;
  const recent = (rateLimitHits.get(ip) ?? []).filter((t) => t > cutoff);
  recent.push(now);
  rateLimitHits.set(ip, recent);
  return recent.length > RATE_LIMIT.max;
}

// ---------------------------------------------------------------------------
// Fornecedor A — GET /supplier-a/quotes?origin=&destination=&date=
// Latência 100-800ms · 5% de erro 500 · nomes de campo em inglês
// ---------------------------------------------------------------------------

app.get('/supplier-a/quotes', async (req, res) => {
  const supplier = 'supplier-a';
  // Guarda a referência do bucket: se um /admin/reset acontecer com esta requisição
  // ainda em voo, os incrementos seguintes caem no bucket antigo (descartado) em vez
  // de sujar os contadores novos. Sem isto, `ok` pode passar `calls`.
  const stats = state.stats[supplier];
  stats.calls++;

  const parsed = normalizeQuery(req.query.origin, req.query.destination, req.query.date);
  if (!parsed.value) {
    stats.badRequest++;
    return res.status(400).json({ error: parsed.error });
  }

  if (state.forceFail.has(supplier)) {
    stats.errors++;
    return res.status(500).json({ error: 'internal supplier error' });
  }

  await sleep(latencyFor(supplier));

  if (shouldFail(supplier)) {
    stats.errors++;
    return res.status(500).json({ error: 'internal supplier error' });
  }

  const { origin, destination, date } = parsed.value;
  stats.ok++;
  res.json({
    results: offersFor(supplier, origin, destination, date).map((o) => ({
      miles: o.miles,
      taxes_brl: o.taxesBrl,
      carrier: o.carrier,
    })),
  });
});

// ---------------------------------------------------------------------------
// Fornecedor B — GET /supplier-b/search?from=&to=&day=
// Latência 1-5s · 20% de erro 500 · rate limit 5 req/s por IP → 429
// Nomes de parâmetro e de campo diferentes de propósito.
// ---------------------------------------------------------------------------

app.get('/supplier-b/search', async (req, res) => {
  const supplier = 'supplier-b';
  // Guarda a referência do bucket: se um /admin/reset acontecer com esta requisição
  // ainda em voo, os incrementos seguintes caem no bucket antigo (descartado) em vez
  // de sujar os contadores novos. Sem isto, `ok` pode passar `calls`.
  const stats = state.stats[supplier];
  stats.calls++;

  if (exceedsRateLimit(req.ip)) {
    stats.rateLimited++;
    return res.status(429).set('Retry-After', '1').json({ erro: 'limite de requisicoes excedido' });
  }

  const parsed = normalizeQuery(req.query.from, req.query.to, req.query.day);
  if (!parsed.value) {
    stats.badRequest++;
    return res.status(400).json({ erro: parsed.error });
  }

  if (state.forceFail.has(supplier)) {
    stats.errors++;
    return res.status(500).json({ erro: 'falha interna' });
  }

  await sleep(latencyFor(supplier));

  if (shouldFail(supplier)) {
    stats.errors++;
    return res.status(500).json({ erro: 'falha interna' });
  }

  const { origin, destination, date } = parsed.value;
  stats.ok++;
  res.json({
    dados: offersFor(supplier, origin, destination, date).map((o) => ({
      pontos: o.miles,
      taxa: { valor: o.taxesBrl, moeda: 'BRL' },
      cia: o.carrier,
    })),
  });
});

// ---------------------------------------------------------------------------
// Fornecedor C — POST /supplier-c/v2/quotes (body JSON)
// Rápido e sem falha de rede, mas 10% das respostas vêm sujas.
// Usa código IATA da companhia (LA, G3, AD) em vez do nome.
// ---------------------------------------------------------------------------

/** Aplica a sujeira pedida: array vazio, campo null, ou número como string. */
function corrupt(data, mode) {
  if (mode === 'empty') return [];
  if (mode === 'null') {
    return data.map((item, i) => (i === 0 ? { ...item, fee: null } : item));
  }
  return data.map((item, i) => (i === 0 ? { ...item, price_miles: String(item.price_miles) } : item));
}

app.post('/supplier-c/v2/quotes', async (req, res) => {
  const supplier = 'supplier-c';
  // Guarda a referência do bucket: se um /admin/reset acontecer com esta requisição
  // ainda em voo, os incrementos seguintes caem no bucket antigo (descartado) em vez
  // de sujar os contadores novos. Sem isto, `ok` pode passar `calls`.
  const stats = state.stats[supplier];
  stats.calls++;

  const body = req.body ?? {};
  const parsed = normalizeQuery(body.origin, body.destination, body.date);
  if (!parsed.value) {
    stats.badRequest++;
    return res.status(400).json({ message: parsed.error });
  }

  if (state.forceFail.has(supplier)) {
    stats.errors++;
    return res.status(500).json({ message: 'upstream failure' });
  }

  await sleep(latencyFor(supplier));

  const { origin, destination, date } = parsed.value;
  let data = offersFor(supplier, origin, destination, date).map((o) => ({
    price_miles: o.miles,
    fee: o.taxesBrl,
    airline_code: o.iata,
  }));

  const dirtyMode = dirtyModeFor(supplier);
  if (dirtyMode) {
    data = corrupt(data, dirtyMode);
    stats.dirty++;
    stats.dirtyModes[dirtyMode]++;
  }

  stats.ok++;
  res.json({ data });
});

// ---------------------------------------------------------------------------
// /admin — controle de comportamento, para tornar cenários reprodutíveis
// ---------------------------------------------------------------------------

function overridesSnapshot() {
  return {
    forceFail: [...state.forceFail],
    forceSlow: [...state.forceSlow],
    // Objeto, não lista: aqui o fornecedor vem acompanhado do modo de sujeira.
    forceDirty: Object.fromEntries(state.forceDirty),
  };
}

function applyOverride(res, name, bucket, label) {
  const supplier = resolveSupplier(name);
  if (!supplier) {
    return res.status(400).json({ error: `fornecedor inválido. Use: ${SUPPLIERS.join(', ')}` });
  }
  state[bucket].add(supplier);
  return res.json({ ok: true, applied: label, supplier, overrides: overridesSnapshot() });
}

/** 100% de falha no fornecedor. Responde imediatamente, sem esperar a latência. */
app.post('/admin/force-fail/:supplier', (req, res) =>
  applyOverride(res, req.params.supplier, 'forceFail', 'force-fail'));

/** Latência fixa de 8s — acima do teto de 6s exigido pelo RF1. */
app.post('/admin/force-slow/:supplier', (req, res) =>
  applyOverride(res, req.params.supplier, 'forceSlow', 'force-slow'));

/**
 * Força payload sujo (só faz efeito no supplier-c).
 *
 * Aceita o modo em `?mode=` ou no corpo: `empty`, `null`, `string` fixam a sujeira;
 * `random` (o padrão) suja sempre, sorteando qual. Fixar o modo é o que permite testar
 * um caso específico em vez de esperar o sorteio.
 */
app.post('/admin/force-dirty/:supplier', (req, res) => {
  const supplier = resolveSupplier(req.params.supplier);
  if (!supplier) {
    return res.status(400).json({ error: `fornecedor inválido. Use: ${SUPPLIERS.join(', ')}` });
  }

  const mode = String(req.query.mode ?? req.body?.mode ?? 'random').trim().toLowerCase();
  if (mode !== 'random' && !DIRTY_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode inválido. Use: random, ${DIRTY_MODES.join(', ')}` });
  }

  state.forceDirty.set(supplier, mode);
  return res.json({ ok: true, applied: 'force-dirty', supplier, mode, overrides: overridesSnapshot() });
});

/** Volta ao comportamento padrão E zera os contadores de /admin/stats. */
app.post('/admin/reset', (_req, res) => {
  resetState();
  res.json({ ok: true, reset: true, since: state.since });
});

/**
 * Chamadas recebidas por fornecedor. É isto que revela cache: a mesma busca
 * feita duas vezes deve gerar um único conjunto de chamadas.
 */
app.get('/admin/stats', (_req, res) => {
  const total = Object.values(state.stats).reduce((sum, s) => sum + s.calls, 0);
  res.json({ since: state.since, totalCalls: total, suppliers: state.stats, overrides: overridesSnapshot() });
});

// ---------------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'mock-suppliers',
    airports: AIRPORTS,
    carriers: CARRIERS,
    endpoints: {
      'supplier-a': 'GET /supplier-a/quotes?origin=&destination=&date=',
      'supplier-b': 'GET /supplier-b/search?from=&to=&day=',
      'supplier-c': 'POST /supplier-c/v2/quotes  { origin, destination, date }',
      admin: [
        'POST /admin/force-fail/:supplier',
        'POST /admin/force-slow/:supplier',
        'POST /admin/force-dirty/:supplier?mode=random|empty|null|string',
        'POST /admin/reset',
        'GET  /admin/stats',
      ],
    },
  });
});

app.use((_req, res) => res.status(404).json({ error: 'rota não encontrada' }));

app.listen(PORT, () => {
  console.log(`[mock-suppliers] ouvindo em http://localhost:${PORT}`);
  console.log(`[mock-suppliers] aeroportos: ${AIRPORTS.join(', ')}`);
});
