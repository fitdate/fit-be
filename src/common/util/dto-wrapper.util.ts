import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

type Constructor<T = any> = new (...args: any[]) => T;

export function createWrapperDto<T>(
  TargetDto: Constructor<T>,
  description: string,
) {
  class DynamicWrapper {
    @ApiProperty({ description, type: () => TargetDto })
    @ValidateNested()
    @Type(() => TargetDto)
    filters: T;
  }

  return DynamicWrapper;
}
