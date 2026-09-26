import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

/** Mirrors the browser's PushSubscription.toJSON() shape. */
export class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_tld: false })
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;

  // toJSON() includes this (usually null); accept it so the whitelist doesn't reject the body.
  @IsOptional()
  expirationTime?: number | null;
}

export class UnsubscribeDto {
  @IsUrl({ protocols: ['https'], require_tld: false })
  endpoint: string;
}
