import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class StartThreadDto {
  @IsUUID()
  recipientUuid!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
