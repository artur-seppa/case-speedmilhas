import { BadRequestException, Body, Controller, Post } from '@nestjs/common';

import { SearchRequestDto } from './dto/search-request.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { serializeSearchResult } from './serializers/search-result.serializer';
import { SearchFlightsUseCase } from './use-cases/search-flights.use-case';

@Controller('search')
export class SearchController {
  constructor(private readonly useCase: SearchFlightsUseCase) {}

  @Post()
  async search(@Body() dto: SearchRequestDto): Promise<SearchResponseDto> {
    if (dto.origin === dto.destination) {
      throw new BadRequestException('origin e destination devem ser diferentes');
    }

    const result = await this.useCase.execute(dto);
    return serializeSearchResult(result);
  }
}
