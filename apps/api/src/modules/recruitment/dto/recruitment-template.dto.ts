import { IsString, IsOptional, IsInt, IsIn, Min } from 'class-validator';

const TEMPLATE_CATEGORIES = ['description', 'requirements'] as const;

export class CreateRecruitmentTemplateDto {
  @IsIn(TEMPLATE_CATEGORIES)
  category: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRecruitmentTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
