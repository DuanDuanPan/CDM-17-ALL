import { IsOptional, IsString } from 'class-validator';

export class UpdateDataFolderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

