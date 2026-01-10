import { IsOptional, IsString } from 'class-validator';

export class CreateDataFolderDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  graphId!: string;
}

