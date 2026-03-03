import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  Delete,
  Put,
} from "@nestjs/common";
import { IsArray, IsEmail, IsNumber, ArrayMinSize, ArrayMaxSize } from "class-validator";
import { FaceIdService } from "./faceid.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

// Request type with user
interface RequestWithUser {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

// DTOs
class EnableFaceIdDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  embedding: number[];
}

class FaceIdLoginDto {
  @IsEmail()
  email: string;

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  embedding: number[];
}

@Controller("faceid")
export class FaceIdController {
  constructor(private readonly faceIdService: FaceIdService) {}

  /**
   * Check if user has Face ID enabled (public endpoint)
   */
  @Get("status")
  async checkStatus(@Query("email") email: string) {
    return this.faceIdService.checkFaceIdStatus(email);
  }

  /**
   * Enable Face ID for authenticated user
   */
  @Post("enable")
  @UseGuards(JwtAuthGuard)
  async enableFaceId(
    @Request() req: RequestWithUser,
    @Body() dto: EnableFaceIdDto,
  ) {
    return this.faceIdService.enableFaceId(req.user.userId, dto.embedding);
  }

  /**
   * Disable Face ID for authenticated user
   */
  @Delete("disable")
  @UseGuards(JwtAuthGuard)
  async disableFaceId(@Request() req: RequestWithUser) {
    return this.faceIdService.disableFaceId(req.user.userId);
  }

  /**
   * Update face embedding (re-enrollment)
   */
  @Put("update")
  @UseGuards(JwtAuthGuard)
  async updateEmbedding(
    @Request() req: RequestWithUser,
    @Body() dto: EnableFaceIdDto,
  ) {
    return this.faceIdService.updateFaceEmbedding(
      req.user.userId,
      dto.embedding,
    );
  }

  /**
   * Login with Face ID (public endpoint)
   */
  @Post("login")
  async loginWithFaceId(@Body() dto: FaceIdLoginDto) {
    return this.faceIdService.authenticateWithFaceId(dto.email, dto.embedding);
  }
}
