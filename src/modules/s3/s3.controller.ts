import { Controller } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}
}
