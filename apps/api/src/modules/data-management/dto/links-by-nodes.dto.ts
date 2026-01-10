import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class LinksByNodesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  nodeIds!: string[];
}

