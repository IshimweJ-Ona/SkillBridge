import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^\+?[0-9\s().-]{7,20}$/, {
    message: 'Phone number must be a valid local or international number.',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
