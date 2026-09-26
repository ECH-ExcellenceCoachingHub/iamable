import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AddSamplesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  /** Whole-body clip vectors from the frontend's body-features.ts. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  vectors: number[][];

  /** Groups the clips of one recording so they can be held out together. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recordingId?: string;
}
