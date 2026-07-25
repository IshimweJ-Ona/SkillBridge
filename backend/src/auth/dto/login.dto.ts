import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
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
  @MinLength(8)
  password!: string;
}
