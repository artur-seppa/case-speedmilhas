import { validate } from 'class-validator';

import { IsCPF, isValidCPF } from './is-cpf.validator';

describe('isValidCPF', () => {
  it('aceita um CPF válido conhecido, formatado', () => {
    expect(isValidCPF('111.444.777-35')).toBe(true);
  });

  it('aceita o mesmo CPF sem formatação', () => {
    expect(isValidCPF('11144477735')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCPF('111.444.777-36')).toBe(false);
  });

  it('rejeita sequência de dígitos repetidos', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });

  it('rejeita string com tamanho errado', () => {
    expect(isValidCPF('123')).toBe(false);
  });
});

class TestDto {
  @IsCPF()
  cpf!: string;
}

describe('IsCPF decorator', () => {
  it('marca cpf inválido como erro de validação', async () => {
    const dto = new TestDto();
    dto.cpf = '111.111.111-11';

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'cpf')).toBe(true);
  });

  it('não gera erro para cpf válido', async () => {
    const dto = new TestDto();
    dto.cpf = '111.444.777-35';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
