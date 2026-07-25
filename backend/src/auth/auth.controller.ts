import { Body, Controller, Get, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, RequestUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

type CookieResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options?: Record<string, unknown>) => void;
};

type RedirectResponse = CookieResponse & {
  redirect: (url: string) => void;
};

type CookieRequest = {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.verifyOtp(verifyOtpDto);
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.login(loginDto);
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.refresh(
      this.extractRefreshToken(request, refreshTokenDto.refreshToken),
    );
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Public()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('resend-otp')
  resendOtp(@Body() requestDto: RequestPasswordResetDto) {
    return this.authService.resendOtp(requestDto);
  }

  @Public()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('password-reset/request')
  requestPasswordReset(@Body() requestDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestDto);
  }

  @Public()
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() requestDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('password-reset/confirm')
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.resetPassword(resetDto);
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPasswordAlias(
    @Body() resetDto: ResetPasswordDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.resetPassword(resetDto);
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.changePassword(
      user.sub,
      changePasswordDto,
    );
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Post('password/change')
  async changePasswordAlias(
    @CurrentUser() user: RequestUser,
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const authResponse = await this.authService.changePassword(
      user.sub,
      changePasswordDto,
    );
    this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  // Manual OAuth flow (no @nestjs/passport dependency - this app issues its
  // own JWTs via TokenService, so Google is just another way to arrive at
  // the same issueAuthResponse() path used by password login). Untestable
  // end-to-end without real Google Cloud OAuth credentials - see
  // GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI in .env.example.
  @Public()
  @Get('google')
  async googleRedirect(
    @Query('role') role: string | undefined,
    @Res({ passthrough: false }) response: RedirectResponse,
  ) {
    try {
      const url = await this.authService.buildGoogleAuthUrl(role);
      response.redirect(url);
    } catch {
      response.redirect(this.buildFrontendErrorRedirect('oauth_not_configured'));
    }
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res({ passthrough: false }) response: RedirectResponse,
  ) {
    if (error || !code) {
      response.redirect(this.buildFrontendErrorRedirect('oauth_denied'));
      return;
    }

    try {
      const authResponse = await this.authService.handleGoogleCallback(code, state);
      this.setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken);
      response.redirect(this.buildFrontendRedirect());
    } catch {
      response.redirect(this.buildFrontendErrorRedirect('oauth_failed'));
    }
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }

  @Patch('onboarding')
  completeOnboarding(@CurrentUser() user: RequestUser) {
    return this.authService.completeOnboarding(user.sub);
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: RequestUser,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    await this.authService.logout(
      user.sub,
      this.extractRefreshToken(request, refreshTokenDto.refreshToken),
    );
    response.clearCookie('access_token', this.cookieClearOptions());
    response.clearCookie('refresh_token', this.cookieClearOptions());
    return { message: 'Logged out successfully.' };
  }

  private setAuthCookies(
    response: CookieResponse,
    accessToken: string,
    refreshToken: string,
  ) {
    // Defaults to NODE_ENV so real HTTPS-fronted deployments keep the Secure
    // flag, but COOKIE_SECURE=false lets a plain-HTTP environment (e.g. this
    // docker-compose stack with no TLS termination in front of it) opt out -
    // otherwise the browser silently drops the cookie and login never
    // persists, even though the API call itself succeeds.
    const secure = process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private extractRefreshToken(request: CookieRequest, bodyToken?: string) {
    if (bodyToken) return bodyToken;
    if (request.cookies?.refresh_token) return request.cookies.refresh_token;

    const cookieHeader = request.headers.cookie;
    const cookie = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;

    return cookie
      ?.split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith('refresh_token='))
      ?.slice('refresh_token='.length);
  }

  private cookieClearOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    };
  }

  private buildFrontendRedirect() {
    const appBaseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    return `${appBaseUrl}/oauth-callback`;
  }

  private buildFrontendErrorRedirect(reason: string) {
    return `${this.buildFrontendRedirect()}?error=${encodeURIComponent(reason)}`;
  }
}
