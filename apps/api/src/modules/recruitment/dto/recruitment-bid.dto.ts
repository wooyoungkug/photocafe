import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRecruitmentBidDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  proposedBudget?: number;
}

export class SelectBidDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectBidDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
