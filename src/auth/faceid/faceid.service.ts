import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import { User, UserDocument } from "../../users/schemas/user.schema";

@Injectable()
export class FaceIdService {
  private readonly threshold: number;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    // Threshold for face matching (lower = stricter)
    this.threshold = parseFloat(
      this.configService.get("FACEID_THRESHOLD") || "0.6",
    );
  }

  /**
   * Check if user has Face ID enabled
   */
  async checkFaceIdStatus(email: string): Promise<{ faceIdEnabled: boolean }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return { faceIdEnabled: Boolean(user.faceIdEnabled) };
  }

  /**
   * Enable Face ID for a user by saving their face embedding
   */
  async enableFaceId(
    userId: string,
    embedding: number[],
  ): Promise<{ message: string }> {
    // Validate embedding
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
      throw new BadRequestException(
        "Invalid embedding. Expected 128 float values.",
      );
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Save embedding and enable Face ID
    user.faceEmbedding = embedding;
    user.faceIdEnabled = true;
    await user.save();

    return { message: "Face ID enabled successfully" };
  }

  /**
   * Disable Face ID for a user
   */
  async disableFaceId(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.faceEmbedding = [];
    user.faceIdEnabled = false;
    await user.save();

    return { message: "Face ID disabled successfully" };
  }

  /**
   * Authenticate user with Face ID
   */
  async authenticateWithFaceId(
    email: string,
    embedding: number[],
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    // Validate embedding
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
      throw new BadRequestException(
        "Invalid embedding. Expected 128 float values.",
      );
    }

    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const storedEmbedding = user.faceEmbedding as number[] | undefined;
    if (!user.faceIdEnabled || !storedEmbedding || storedEmbedding.length === 0) {
      throw new BadRequestException("Face ID is not enabled for this user");
    }

    if (user.isBanned) {
      throw new UnauthorizedException("Account is banned");
    }

    // Compare embeddings using Euclidean distance
    const distance = this.calculateEuclideanDistance(embedding, storedEmbedding);

    if (distance > this.threshold) {
      throw new UnauthorizedException(
        "Face verification failed. Please try again.",
      );
    }

    // Generate tokens
    const payload = { email: user.email, sub: user._id, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_REFRESH_SECRET"),
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRATION") || "7d",
    });

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Return user without sensitive data
    const userObject = user.toObject() as unknown as Record<string, unknown>;
    userObject.passwordHash = undefined;
    userObject.refreshToken = undefined;
    userObject.faceEmbedding = undefined;
    userObject.twoFactorSecret = undefined;
    userObject.twoFactorRecoveryCodes = undefined;

    return {
      accessToken,
      refreshToken,
      user: userObject,
    };
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  private calculateEuclideanDistance(
    embedding1: number[],
    embedding2: number[],
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new BadRequestException("Embedding dimensions do not match");
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Update face embedding (for re-enrollment)
   */
  async updateFaceEmbedding(
    userId: string,
    embedding: number[],
  ): Promise<{ message: string }> {
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
      throw new BadRequestException(
        "Invalid embedding. Expected 128 float values.",
      );
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.faceIdEnabled) {
      throw new BadRequestException("Face ID is not enabled for this user");
    }

    user.faceEmbedding = embedding;
    await user.save();

    return { message: "Face embedding updated successfully" };
  }
}
