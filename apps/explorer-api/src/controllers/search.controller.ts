import { Body, Controller, HttpCode, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { SearchRequestDto, SearchResponseDto } from '@app/shared/dtos';
import { ExplorerExceptionFilter } from '../filters';
import { ResponseInterceptor } from '../interceptors';
import { SearchService } from '../services';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Search')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @HttpCode(200)
  async getSearchResults(@Body() body: SearchRequestDto): Promise<SearchResponseDto> {
    return this.searchService.getSearchResults(body.criteria);
  }
}
