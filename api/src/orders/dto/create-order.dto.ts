import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

import { IsCPF } from '../../common/validators/is-cpf.validator';

export class PassengerDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @Transform(({ value }: { value: unknown }) => String(value ?? '').replace(/\D/g, ''))
  @IsCPF()
  cpf!: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  quoteId!: string;

  @ValidateNested()
  @Type(() => PassengerDto)
  passageiro!: PassengerDto;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
