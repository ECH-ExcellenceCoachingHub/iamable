import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateTrainingDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  trainingName?: string;

  /** Defaults to the next version number. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  modelVersion?: string;

  @IsOptional()
  @IsObject()
  trainingData?: any;

  @IsOptional()
  @IsNumber()
  datasetSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  epochs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1024)
  batchSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.00001)
  @Max(1)
  learningRate?: number;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(256)
  hiddenUnits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  validationSplit?: number;

  /** Deploy automatically when the new model scores at least as well as the active one. */
  @IsOptional()
  @IsBoolean()
  autoDeploy?: boolean;
}
