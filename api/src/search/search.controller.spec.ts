import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SearchController } from './search.controller';
import { SearchRequestDto } from './dto/search-request.dto';
import { SearchFlightsUseCase, SearchFlightsResult } from './use-cases/search-flights.use-case';

describe('SearchController', () => {
  const fakeResult: SearchFlightsResult = {
    offers: [],
    suppliers: {
      'supplier-a': { status: 'ok' },
      'supplier-b': { status: 'ok' },
      'supplier-c': { status: 'ok' },
    },
    partial: false,
    tookMs: 100,
  };

  async function buildController(execute: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchFlightsUseCase, useValue: { execute } }],
    }).compile();

    return moduleRef.get(SearchController);
  }

  it('chama o use-case e devolve a resposta serializada', async () => {
    const execute = jest.fn().mockResolvedValue(fakeResult);
    const controller = await buildController(execute);
    const dto: SearchRequestDto = { origin: 'GRU', destination: 'GIG', date: '2026-08-15' };

    const response = await controller.search(dto);

    expect(execute).toHaveBeenCalledWith(dto);
    expect(response.partial).toBe(false);
  });

  it('rejeita origin igual a destination sem chamar o use-case', async () => {
    const execute = jest.fn();
    const controller = await buildController(execute);
    const dto: SearchRequestDto = { origin: 'GRU', destination: 'GRU', date: '2026-08-15' };

    await expect(controller.search(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });
});
