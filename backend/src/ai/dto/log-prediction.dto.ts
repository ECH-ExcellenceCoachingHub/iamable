import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class LogPredictionDto {
  @IsString()
  @MaxLength(120)
  gesture: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  processingTime?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  modelVersion?: string;

  @IsOptional()
  @IsIn(['sign-to-text', 'knowledge-check'])
  source?: string;

  /** The sign that was really shown, for knowledge checks. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  expected?: string;
}
