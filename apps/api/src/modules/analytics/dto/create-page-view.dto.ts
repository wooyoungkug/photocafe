import { IsOptional, IsString } from 'class-validator';

export class CreatePageViewDto {
  @IsString()
  path: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  referer?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
