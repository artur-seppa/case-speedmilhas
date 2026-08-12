// Carrega o api/.env. Sem isto, DATABASE_URL e SUPPLIERS_BASE_URL chegam undefined.
// Se você preferir @nestjs/config, troque — não temos preferência.
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // O `web` roda em outra porta, então precisa de CORS. Já vem ligado para você
  // não perder tempo com isso.
  app.enableCors();

  // A porta vem de env para ser possível subir duas instâncias em paralelo
  // (você vai precisar disso no RF2): PORT=3000 e PORT=3010, por exemplo.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(`[api] ouvindo em http://localhost:${port}`);
}

void bootstrap();
