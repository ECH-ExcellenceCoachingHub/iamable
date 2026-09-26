import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTranslationDto } from './create-translation.dto';

/** A translation keeps its type; its text and confidence change as the user keeps going. */
export class UpdateTranslationDto extends PartialType(OmitType(CreateTranslationDto, ['inputType', 'gestureData'] as const)) {}
