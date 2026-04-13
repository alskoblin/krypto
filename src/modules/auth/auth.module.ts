import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlService } from './access-control.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_EXPIRES_IN_FALLBACK, JWT_SECRET_FALLBACK } from './constants';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? JWT_SECRET_FALLBACK,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? JWT_EXPIRES_IN_FALLBACK) as any,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessControlService],
  exports: [AuthService, AccessControlService, JwtModule],
})
export class AuthModule {}
