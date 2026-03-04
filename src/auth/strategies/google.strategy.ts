import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // Skip initialization if credentials are not configured
    if (!clientID || !clientSecret) {
      super({
        clientID: 'placeholder',
        clientSecret: 'placeholder',
        callbackURL: callbackURL || 'http://localhost:3001/auth/google/callback',
        scope: ['email', 'profile'],
      });
      console.warn('⚠️  Google OAuth disabled: credentials not configured');
      return;
    }

    super({
      clientID,
      clientSecret,
      callbackURL: callbackURL || 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      providerId: id,
      email: emails[0].value,
      username: emails[0].value.split('@')[0], // Use email prefix as username
      firstName: name.givenName,
      lastName: name.familyName,
      avatar: photos[0].value,
      provider: 'google',
    };

    done(null, user);
  }
}
