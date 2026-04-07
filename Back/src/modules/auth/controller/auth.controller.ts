import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import type { RequestUser } from '@/shared/types/request-user.type';
import { AuthService } from '../auth.service';
import { ChangeFirstLoginPasswordDto } from '../dto/change-first-login-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterPatientDto } from '../dto/register-patient.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.getSession(user);
  }

  @Post('register-patient')
  registerPatient(@Body() body: RegisterPatientDto) {
    return this.authService.registerPatient(body);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @Post('resend-verification')
  resendVerification(@Body() body: RequestPasswordResetDto) {
    return this.authService.resendVerificationCode(body);
  }

  @Post('forgot-password/request')
  requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(body);
  }

  @Post('forgot-password/verify')
  verifyPasswordResetCode(@Body() body: VerifyEmailDto) {
    return this.authService.verifyPasswordResetCode(body);
  }

  @Post('forgot-password/reset')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('first-login/change-password')
  changeFirstLoginPassword(
    @CurrentUser() user: RequestUser,
    @Body() body: ChangeFirstLoginPasswordDto,
  ) {
    return this.authService.changeFirstLoginPassword(user, body.password);
  }
}
