import { Test } from '@nestjs/testing';

import { AppModule } from './app.module';

/**
 * Teste trivial, só para provar que o setup de teste funciona: ts-jest compila,
 * os decoradores do Nest resolvem e o módulo sobe. Se este passa, você pode
 * escrever seus testes sem mexer em configuração.
 *
 * Pode apagar quando tiver testes de verdade.
 */
describe('AppModule', () => {
  it('compila e inicializa', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    expect(moduleRef).toBeDefined();

    await moduleRef.close();
  });
});
