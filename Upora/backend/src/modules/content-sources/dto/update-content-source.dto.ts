import { PartialType } from '@nestjs/mapped-types';
import { CreateContentSourceDto } from './create-content-source.dto';

export class UpdateContentSourceDto extends PartialType(CreateContentSourceDto) {}

