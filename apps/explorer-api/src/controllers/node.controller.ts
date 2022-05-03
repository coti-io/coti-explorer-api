import { Body, Controller, HttpCode, Post, Put, UploadedFile, UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { CreateNodeInfoRequestDto, NodeInfoRequestDto, NodeInfoResponseDto, NodeUploadImageUrlResponseDto } from '@app/shared';
import { ExplorerExceptionFilter } from '../filters';
import { ExtendedMulterFile, FileExtender, ResponseInterceptor } from '../interceptors';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { NodeService } from '../services';
import { AdminApiKeyAuthGuard } from '../guards/admin-api-key-auth.guard';

@ApiTags('Node')
@UseInterceptors(ResponseInterceptor)
@UseFilters(ExplorerExceptionFilter)
@Controller('node')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Post()
  @HttpCode(200)
  async getInfo(): Promise<NodeInfoResponseDto[]> {
    return this.nodeService.getInfos();
  }

  @ApiBearerAuth()
  @UseGuards(AdminApiKeyAuthGuard)
  @Put('info')
  @HttpCode(201)
  async createInfo(@Body() body: CreateNodeInfoRequestDto): Promise<NodeInfoResponseDto> {
    return this.nodeService.updateNodeExtraDetails(body);
  }

  @Post('get-info')
  @HttpCode(200)
  async getNodeInfo(@Body() body: NodeInfoRequestDto): Promise<NodeInfoResponseDto> {
    return this.nodeService.getInfo(body);
  }

  @ApiBearerAuth()
  @UseGuards(AdminApiKeyAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Put('upload-icon')
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile('file') file: ExtendedMulterFile): Promise<NodeUploadImageUrlResponseDto> {
    return this.nodeService.uploadIcon(file);
  }
}
