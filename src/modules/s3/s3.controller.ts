import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { S3Service } from './s3.service';
import { CreateS3Dto } from './dto/create-s3.dto';
import { UpdateS3Dto } from './dto/update-s3.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @ApiOperation({
    summary: 'S3 리소스 생성',
    description: '새로운 S3 리소스를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: 'S3 리소스가 성공적으로 생성되었습니다.',
  })
  @ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
  @Post()
  create(@Body() createS3Dto: CreateS3Dto) {
    return this.s3Service.create(createS3Dto);
  }

  @ApiOperation({
    summary: '모든 S3 리소스 조회',
    description: '모든 S3 리소스 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'S3 리소스 목록을 성공적으로 조회했습니다.',
  })
  @Get()
  findAll() {
    return this.s3Service.findAll();
  }

  @ApiOperation({
    summary: '특정 S3 리소스 조회',
    description: 'ID로 특정 S3 리소스를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'S3 리소스를 성공적으로 조회했습니다.',
  })
  @ApiResponse({ status: 404, description: 'S3 리소스를 찾을 수 없습니다.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.s3Service.findOne(+id);
  }

  @ApiOperation({
    summary: 'S3 리소스 수정',
    description: '특정 S3 리소스의 정보를 수정합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'S3 리소스가 성공적으로 수정되었습니다.',
  })
  @ApiResponse({ status: 404, description: 'S3 리소스를 찾을 수 없습니다.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateS3Dto: UpdateS3Dto) {
    return this.s3Service.update(+id, updateS3Dto);
  }

  @ApiOperation({
    summary: 'S3 리소스 삭제',
    description: '특정 S3 리소스를 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'S3 리소스가 성공적으로 삭제되었습니다.',
  })
  @ApiResponse({ status: 404, description: 'S3 리소스를 찾을 수 없습니다.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.s3Service.remove(+id);
  }
}
