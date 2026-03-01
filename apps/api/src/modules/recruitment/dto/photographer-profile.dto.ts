import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class UpsertPhotographerProfileDto {
  @IsOptional()
  @IsString()
  preferredRegion1?: string;

  @IsOptional()
  @IsString()
  preferredRegion2?: string;

  @IsOptional()
  @IsString()
  preferredRegion3?: string;

  @IsOptional()
  @IsString()
  introduction?: string;

  @IsOptional()
  @IsString()
  career?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  careerYears?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioImages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsBoolean()
  isAvailableForPublic?: boolean;
}
