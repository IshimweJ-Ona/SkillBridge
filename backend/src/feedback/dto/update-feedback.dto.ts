import { FeedbackAudience, FeedbackStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackAudience)
  audience?: FeedbackAudience;

  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  organizationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  internalNotes?: string;
}
