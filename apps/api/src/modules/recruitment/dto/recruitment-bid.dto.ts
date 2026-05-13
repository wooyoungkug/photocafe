import { IsString, IsOptional, IsInt, IsIn, Min } from 'class-validator';

export class CreateRecruitmentBidDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  proposedBudget?: number;

  @IsOptional()
  @IsIn(['solo', 'duo'])
  crewSize?: string;
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
