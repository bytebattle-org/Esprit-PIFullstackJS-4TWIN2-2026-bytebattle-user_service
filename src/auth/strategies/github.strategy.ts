import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GITHUB_CALLBACK_URL');

    // Skip initialization if credentials are not configured
    if (!clientID || !clientSecret) {
      super({
        clientID: 'placeholder',
        clientSecret: 'placeholder',
        callbackURL: callbackURL || 'http://localhost:3001/auth/github/callback',
        scope: ['user:email'],
      });
      console.warn('⚠️  GitHub OAuth disabled: credentials not configured');
      return;
    }

    super({
      clientID,
      clientSecret,
      callbackURL: callbackURL || 'http://localhost:3001/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, username, emails, photos } = profile;
    
    const user = {
      providerId: id,
      email: emails && emails[0] ? emails[0].value : `${username}@github.com`,
      username: username,
      avatar: photos && photos[0] ? photos[0].value : null,
      provider: 'github',
    };

    done(null, user);
  }
}
