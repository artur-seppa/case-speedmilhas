import { Transform } from 'class-transformer';
import { IsIn, IsISO8601, Matches } from 'class-validator';

import { AIRPORTS } from '../../common/airports';

const normalizeAirport = ({ value }: { value: unknown }): string => String(value ?? '').trim().toUpperCase();

export class SearchRequestDto {
  @Transform(normalizeAirport)
  @IsIn(AIRPORTS, { message: `origin deve ser um dos aeroportos atendidos: ${AIRPORTS.join(', ')}` })
  origin!: string;

  @Transform(normalizeAirport)
  @IsIn(AIRPORTS, { message: `destination deve ser um dos aeroportos atendidos: ${AIRPORTS.join(', ')}` })
  destination!: string;

  @Transform(({ value }: { value: unknown }) => String(value ?? '').trim())
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'date deve ser uma data de calendário válida' })
  date!: string;
}
