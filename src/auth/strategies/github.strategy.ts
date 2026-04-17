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
      scope: ['user:email', 'read:user'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, username, displayName, emails, photos, _json } = profile;
    
    // Try to get email from multiple sources
    let email: string;
    if (emails && emails[0]) {
      email = emails[0].value;
    } else if (_json && _json.email) {
      email = _json.email;
    } else {
      // Fallback: use username@github.com
      email = `${username}@github.com`;
    }
    
    // Use displayName if available, otherwise use username
    const name = displayName || username || 'GitHub User';
    
    const user = {
      providerId: id,
      email: email,
      username: name,
      avatar: photos && photos[0] ? photos[0].value : null,
      provider: 'github',
    };

    done(null, user);
  }
}
