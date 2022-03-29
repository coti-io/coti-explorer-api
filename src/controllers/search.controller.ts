import { Body, Controller, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { SearchRequestDto, SearchResponseDto } from 'src/dtos/search.dto';
import { ExplorerExceptionFilter } from 'src/filters/http-exception.filter';
import { ResponseInterceptor } from 'src/interceptors/response.interceptor';
import { SearchService } from 'src/services/search.service';
@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async getWalletCount(@Body() body: SearchRequestDto): Promise<SearchResponseDto> {
    return await this.searchService.getSearchResults(body.criteria);
  }
}
