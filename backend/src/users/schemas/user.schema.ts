import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop()
  profileImage: string;

  @Prop({
    type: {
      largeText: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      keyboardNavigation: { type: Boolean, default: true },
      screenReader: { type: Boolean, default: false },
    },
    default: {
      largeText: false,
      highContrast: false,
      reducedMotion: false,
      keyboardNavigation: true,
      screenReader: false,
    },
  })
  accessibilityPreferences: {
    largeText: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    keyboardNavigation: boolean;
    screenReader: boolean;
  };

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  suspendedReason: string;

  @Prop()
  lastLoginAt: Date;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
