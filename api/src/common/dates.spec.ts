import { todayInBrazil } from './dates';

describe('todayInBrazil', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retorna a data corrente no fuso de Brasília', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T15:00:00.000Z'));
    expect(todayInBrazil()).toBe('2026-08-12');
  });

  it('ainda é o dia anterior em Brasília quando UTC já virou o dia', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-13T01:30:00.000Z'));
    expect(todayInBrazil()).toBe('2026-08-12');
  });
});
