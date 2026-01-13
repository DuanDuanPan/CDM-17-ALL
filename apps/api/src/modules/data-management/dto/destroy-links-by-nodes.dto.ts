import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class DestroyLinksByNodesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  nodeIds!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  assetIds!: string[];
}

