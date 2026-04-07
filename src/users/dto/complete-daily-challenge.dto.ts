import { IsString, IsNotEmpty } from 'class-validator';

export class CompleteDailyChallengeDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;
}
