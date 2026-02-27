import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class WebAuthnService {
  private rpName: string;
  private rpID: string;
  private origin: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    this.rpName = 'ByteBattle';
    this.rpID = this.configService.get('WEBAUTHN_RP_ID') || 'localhost';
    this.origin = this.configService.get('WEBAUTHN_ORIGIN') || 'http://localhost:5173';
  }

  /**
   * Generate registration options for a user to register their biometric
   */
  async generateRegistrationOptions(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get existing credentials to exclude them
    const excludeCredentials = user.webauthnCredentials?.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransportFuture[],
    })) || [];

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: new TextEncoder().encode(userId),
      userName: user.email,
      userDisplayName: user.username,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // For Face ID / Touch ID / Fingerprint
      },
    });

    // Store the challenge for verification
    user.currentChallenge = options.challenge;
    await user.save();

    return options;
  }

  /**
   * Verify and save the registration response
   */
  async verifyRegistration(userId: string, response: RegistrationResponseJSON) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.currentChallenge) {
      throw new BadRequestException('No challenge found. Please start registration again.');
    }

    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
      });
    } catch (error) {
      throw new BadRequestException(`Registration verification failed: ${error.message}`);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential } = registrationInfo;

      // Store the credential
      const newCredential = {
        credentialId: Buffer.from(credential.id).toString('base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: response.response.transports || [],
        createdAt: new Date(),
      };

      user.webauthnCredentials = user.webauthnCredentials || [];
      user.webauthnCredentials.push(newCredential);
      user.currentChallenge = undefined;
      await user.save();

      return { verified: true, message: 'Biometric authentication registered successfully' };
    }

    throw new BadRequestException('Registration verification failed');
  }

  /**
   * Generate authentication options for login
   */
  async generateAuthenticationOptions(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      throw new BadRequestException('No biometric credentials registered for this user');
    }

    const allowCredentials = user.webauthnCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store the challenge
    user.currentChallenge = options.challenge;
    await user.save();

    return { options, userId: user._id };
  }

  /**
   * Verify authentication response and return user
   */
  async verifyAuthentication(email: string, response: AuthenticationResponseJSON) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.currentChallenge) {
      throw new BadRequestException('No challenge found. Please start authentication again.');
    }

    // Find the credential being used
    const credential = user.webauthnCredentials?.find(
      (cred) => cred.credentialId === response.id,
    );

    if (!credential) {
      throw new BadRequestException('Credential not found');
    }

    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpID,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (error) {
      throw new BadRequestException(`Authentication failed: ${error.message}`);
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the counter
      credential.counter = authenticationInfo.newCounter;
      await user.save();

      // Clear the challenge
      user.currentChallenge = undefined;
      await user.save();

      const { passwordHash, refreshToken, currentChallenge, ...result } = user.toObject();
      return result;
    }

    throw new BadRequestException('Authentication failed');
  }

  /**
   * Check if user has biometric credentials registered
   */
  async hasBiometricCredentials(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      return false;
    }
    return user.webauthnCredentials && user.webauthnCredentials.length > 0;
  }

  /**
   * Remove a biometric credential
   */
  async removeCredential(userId: string, credentialId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.webauthnCredentials = user.webauthnCredentials?.filter(
      (cred) => cred.credentialId !== credentialId,
    ) || [];
    await user.save();

    return { message: 'Credential removed successfully' };
  }
}
