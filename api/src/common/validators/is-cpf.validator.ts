import { registerDecorator, ValidationOptions } from 'class-validator';

function checkDigit(base: string): number {
  let sum = 0;
  let weight = base.length + 1;

  for (const char of base) {
    sum += Number(char) * weight;
    weight -= 1;
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCPF(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const base = digits.slice(0, 9);
  const digit1 = checkDigit(base);
  const digit2 = checkDigit(base + digit1);

  return digits === `${base}${digit1}${digit2}`;
}

export function IsCPF(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidCPF(value);
        },
        defaultMessage(): string {
          return 'cpf inválido';
        },
      },
    });
  };
}
