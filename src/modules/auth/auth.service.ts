import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { USER_ROLE } from '../../domain';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  JWT_EXPIRES_IN_FALLBACK,
  JWT_REFRESH_EXPIRES_IN_FALLBACK,
  JWT_REFRESH_SECRET_FALLBACK,
  JWT_SECRET_FALLBACK,
} from './constants';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    const refreshToken = await this.signRefreshToken(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessExpiresIn(),
      refreshExpiresIn: this.getRefreshExpiresIn(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refresh(payload: RefreshTokenDto) {
    const refreshToken = payload.refreshToken?.trim();
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    let decoded: {
      sub: string;
      email: string;
      role: string;
      type?: string;
    };

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? JWT_REFRESH_SECRET_FALLBACK,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }

    const accessToken = await this.signAccessToken(user.id, user.email, user.role);
    const nextRefreshToken = await this.signRefreshToken(user.id, user.email, user.role);

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.getAccessExpiresIn(),
      refreshExpiresIn: this.getRefreshExpiresIn(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async me(currentUser: AuthenticatedUser) {
    if (!currentUser?.id) {
      throw new UnauthorizedException('User is not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  isAdmin(user: AuthenticatedUser | undefined) {
    return user?.role === USER_ROLE.ADMIN;
  }

  private getAccessExpiresIn() {
    return process.env.JWT_EXPIRES_IN ?? JWT_EXPIRES_IN_FALLBACK;
  }

  private getRefreshExpiresIn() {
    return process.env.JWT_REFRESH_EXPIRES_IN ?? JWT_REFRESH_EXPIRES_IN_FALLBACK;
  }

  private async signAccessToken(userId: string, email: string, role: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
        type: 'access',
      },
      {
        secret: process.env.JWT_SECRET ?? JWT_SECRET_FALLBACK,
        expiresIn: this.getAccessExpiresIn() as any,
      },
    );
  }

  private async signRefreshToken(userId: string, email: string, role: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
        type: 'refresh',
      },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? JWT_REFRESH_SECRET_FALLBACK,
        expiresIn: this.getRefreshExpiresIn() as any,
      },
    );
  }
}
