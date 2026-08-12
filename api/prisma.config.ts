// O Prisma 7 lê a configuração daqui, não do schema.prisma.
//
// O `import 'dotenv/config'` é obrigatório: o Prisma 7 não carrega o .env
// automaticamente. Sem ele, DATABASE_URL vem undefined.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
