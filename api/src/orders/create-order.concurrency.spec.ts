import 'dotenv/config';
import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type Redis from 'ioredis';

import { AppModule } from '../app.module';
import { PrismaService } from '../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../common/redis/redis.provider';
import { QUOTE_REPOSITORY, QuoteRepository } from '../quotes/repositories/quote.repository';

interface RunningInstance {
  app: INestApplication;
  port: number;
}

async function startInstance(): Promise<RunningInstance> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;

  return { app, port };
}

describe('POST /orders — concorrência entre instâncias (RF4)', () => {
  let instanceA: RunningInstance;
  let instanceB: RunningInstance;
  let quoteId: string;
  let idempotencyKey: string;

  beforeAll(async () => {
    instanceA = await startInstance();
    instanceB = await startInstance();

    const quotes = instanceA.app.get<QuoteRepository>(QUOTE_REPOSITORY);
    quoteId = await quotes.save({ supplier: 'supplier-a', carrier: 'GOL', miles: 18500, taxesBrl: 75.51 }, 900);
    idempotencyKey = randomUUID();
  }, 20000);

  afterAll(async () => {
    const redis = instanceA.app.get<Redis>(REDIS_CLIENT);
    const prisma = instanceA.app.get(PrismaService);

    await redis.del(`quote:${quoteId}`);
    await prisma.order.deleteMany({ where: { idempotencyKey } });
    await instanceA.app.close();
    await instanceB.app.close();
  });

  it('duas requisições concorrentes com a mesma idempotencyKey geram um único pedido, com a mesma resposta', async () => {
    const body = JSON.stringify({
      quoteId,
      passageiro: { nome: 'Fulano de Tal', cpf: '111.444.777-35' },
      idempotencyKey,
    });

    const [responseA, responseB] = await Promise.all([
      fetch(`http://localhost:${instanceA.port}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
      fetch(`http://localhost:${instanceB.port}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    ]);

    expect(responseA.status).toBe(201);
    expect(responseB.status).toBe(201);

    const [jsonA, jsonB] = await Promise.all([responseA.json(), responseB.json()]);
    expect(jsonA).toEqual(jsonB);

    const prisma = instanceA.app.get(PrismaService);
    const rows = await prisma.order.findMany({ where: { idempotencyKey } });
    expect(rows).toHaveLength(1);
  });
});
