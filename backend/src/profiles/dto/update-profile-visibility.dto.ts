import { Visibility } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateProfileVisibilityDto {
  @IsEnum(Visibility)
  visibility!: Visibility;
}
