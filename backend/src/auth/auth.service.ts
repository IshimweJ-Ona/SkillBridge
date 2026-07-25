import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, Prisma, Role, SubscriptionPlan, UserStatus } from '@prisma/client';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { renderBrandedEmail } from '../email/templates';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

type OtpAttemptTracker = {
  count: number;
  lockedUntil: number | null;
};

const otpAttempts = new Map<number, OtpAttemptTracker>();

const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCKOUT_MINUTES = 15;

const authUserSelect = {
  id: true,
  uuid: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  location: true,
  role: true,
  status: true,
  onboardingCompletedAt: true,
  createdAt: true,
  updatedAt: true,
  profile: true,
  subscription: true,
} satisfies Prisma.UserSelect;

type AuthUser = Prisma.UserGetPayload<{ select: typeof authUserSelect }>;
type IdentifierInput = {
  email?: string;
  phone?: string;
  identifier?: string;
};
type ContactTarget = {
  channel: 'email' | 'whatsapp';
  value: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async signup(signupDto: SignupDto) {
    const role = signupDto.role ?? Role.YOUTH_USER;
    const email = this.normalizeEmail(signupDto.email);
    const phone = this.normalizePhone(signupDto.phone);

    if (role !== Role.YOUTH_USER && role !== Role.EMPLOYER) {
      throw new BadRequestException('Signup is available for youth and employers only.');
    }

    if (!email && !phone) {
      throw new BadRequestException('Email or phone number is required to sign up.');
    }

    if (role === Role.EMPLOYER && !email) {
      throw new BadRequestException('Employer signup requires an email address.');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash: this.passwordService.hash(signupDto.password),
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          phone,
          location: signupDto.location,
          role,
          status: UserStatus.PENDING_VERIFICATION,
          consentVersion: signupDto.consentVersion ?? 'v1.0',
          consentAcceptedAt: new Date(),
          consents: {
            create: {
              version: signupDto.consentVersion ?? 'v1.0',
              purpose: 'SkillBridge account registration and platform services',
            },
          },
          subscription: {
            create: {
              plan:
                role === Role.EMPLOYER
                  ? SubscriptionPlan.EMPLOYER_PARTNER
                  : SubscriptionPlan.FREE,
              priceCents: role === Role.EMPLOYER ? 4900 : 0,
            },
          },
        },
        select: authUserSelect,
      });

      const verification = await this.createVerificationCode(user);

      return {
        verificationRequired: true,
        verificationChannel: verification.channel,
        deliveryStatus: verification.deliveryStatus,
        user: this.toPublicUser(user),
        message: `Account created. Please verify the OTP sent to your ${verification.channel}.`,
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('An account with this email or phone number already exists.');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: this.identifierWhere(loginDto),
      select: {
        ...authUserSelect,
        passwordHash: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Too many failed attempts. Try again after 15 minutes.');
    }

    if (!this.passwordService.verify(loginDto.password, user.passwordHash)) {
      await this.recordFailedLogin(user, user.failedLoginCount);
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account is not allowed to sign in.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.audit(user.id, AuditAction.LOGIN, 'User', user.uuid, {
      method: 'password',
      identifierType: this.identifierType(loginDto),
    });

    return this.issueAuthResponse(user);
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const user = await this.prisma.user.findFirst({
      where: this.identifierWhere(verifyOtpDto),
      select: { id: true, uuid: true },
    });

    if (!user) {
      throw new BadRequestException('The verification code is invalid or expired.');
    }

    const tracker = otpAttempts.get(user.id) ?? { count: 0, lockedUntil: null };

    if (tracker.lockedUntil && tracker.lockedUntil > Date.now()) {
      throw new HttpException(
        'Too many failed OTP attempts. Try again after 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verification = await this.prisma.identityVerification.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification || verification.codeHash !== this.hashValue(verifyOtpDto.code)) {
      tracker.count += 1;
      if (tracker.count >= OTP_MAX_ATTEMPTS) {
        tracker.lockedUntil = Date.now() + OTP_LOCKOUT_MINUTES * 60_000;
      }
      otpAttempts.set(user.id, tracker);
      throw new BadRequestException('The verification code is invalid or expired.');
    }

    otpAttempts.delete(user.id);

    const [verifiedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
        select: authUserSelect,
      }),
      this.prisma.identityVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() },
      }),
    ]);

    return this.issueAuthResponse(verifiedUser);
  }

  async resendOtp(requestDto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findFirst({
      where: this.identifierWhere(requestDto),
      select: { id: true, email: true, phone: true, status: true },
    });

    if (user && user.status === UserStatus.PENDING_VERIFICATION) {
      const tracker = otpAttempts.get(user.id);
      if (tracker?.lockedUntil && tracker.lockedUntil > Date.now()) {
        throw new HttpException(
          'Too many failed OTP attempts. Try again after 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.createVerificationCode(user);
    }

    return {
      message: 'If that account needs verification, a new code has been sent.',
    };
  }

  async requestPasswordReset(requestDto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findFirst({
      where: this.identifierWhere(requestDto),
      select: { id: true, email: true, phone: true },
    });

    if (user) {
      const token = randomBytes(32).toString('base64url');
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashValue(token),
          expiresAt: this.minutesFromNow(30),
        },
      });
      await this.sendPasswordResetToken(user, token);
    }

    return {
      message: 'If that account exists, a reset token has been sent.',
    };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hashValue(resetDto.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: authUserSelect } },
    });

    if (!resetToken) {
      throw new BadRequestException('The reset token is invalid or expired.');
    }

    if (
      resetToken.user.status === UserStatus.SUSPENDED ||
      resetToken.user.status === UserStatus.DISABLED
    ) {
      throw new UnauthorizedException('This account is not allowed to sign in.');
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: this.passwordService.hash(resetDto.password),
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: authUserSelect,
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.issueAuthResponse(user);
  }

  async changePassword(userUuid: string, changePasswordDto: ChangePasswordDto) {
    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from the current password.');
    }

    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: {
        ...authUserSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account is not allowed to sign in.');
    }

    if (!this.passwordService.verify(changePasswordDto.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: this.passwordService.hash(changePasswordDto.newPassword),
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: authUserSelect,
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'User',
          entityUuid: user.uuid,
          details: { field: 'password' },
        },
      }),
    ]);

    await this.sendAccountNotice(updatedUser, {
      subject: 'Your SkillBridge password was changed',
      text: 'Your SkillBridge password was changed. If this was not you, request a password reset immediately.',
      html: renderBrandedEmail({
        heading: 'Your password was changed',
        paragraphs: [
          'Your SkillBridge password was changed.',
          "If this wasn't you, request a password reset immediately to secure your account.",
        ],
      }),
    });

    return this.issueAuthResponse(updatedUser);
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const payload = this.tokenService.verify(refreshToken, 'refresh');

    if (!payload) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const tokenHash = this.hashValue(refreshToken);
    const now = new Date();

    const authResponse = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (claim.count !== 1) {
        const staleToken = await tx.refreshToken.findUnique({
          where: { tokenHash },
          select: { userId: true },
        });

        if (staleToken) {
          await tx.refreshToken.updateMany({
            where: { userId: staleToken.userId, revokedAt: null },
            data: { revokedAt: now },
          });
        }

        return null;
      }

      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { select: authUserSelect } },
      });

      if (
        !storedToken ||
        storedToken.user.uuid !== payload.sub ||
        storedToken.user.status === UserStatus.SUSPENDED ||
        storedToken.user.status === UserStatus.DISABLED
      ) {
        return null;
      }

      const response = this.createAuthResponse(storedToken.user);
      await this.persistRefreshToken(
        tx,
        storedToken.userId,
        response.refreshToken,
      );
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { replacedByTokenHash: this.hashValue(response.refreshToken) },
      });

      return response;
    });

    if (!authResponse) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    return authResponse;
  }

  async me(userUuid: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: authUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account is not allowed to sign in.');
    }

    return { user: this.toPublicUser(user) };
  }

  async buildGoogleAuthUrl(roleParam?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new BadRequestException('Google sign-in is not configured in this environment.');
    }

    const role = roleParam === Role.EMPLOYER ? Role.EMPLOYER : Role.YOUTH_USER;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state: role,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, stateParam?: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google sign-in is not configured in this environment.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Could not authenticate with Google.');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

    if (!tokenPayload.access_token) {
      throw new UnauthorizedException('Could not authenticate with Google.');
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedException('Could not authenticate with Google.');
    }

    const profile = (await profileResponse.json()) as {
      email?: string;
      given_name?: string;
      family_name?: string;
      email_verified?: boolean;
    };

    const email = this.normalizeEmail(profile.email);

    if (!email || !profile.email_verified) {
      throw new UnauthorizedException('Your Google account must have a verified email address.');
    }

    const role = stateParam === Role.EMPLOYER ? Role.EMPLOYER : Role.YOUTH_USER;

    let user = await this.prisma.user.findUnique({ where: { email }, select: authUserSelect });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName: profile.given_name || 'SkillBridge',
          lastName: profile.family_name || 'User',
          role,
          status: UserStatus.ACTIVE,
          consentVersion: 'v1.0',
          consentAcceptedAt: new Date(),
          consents: {
            create: {
              version: 'v1.0',
              purpose: 'SkillBridge account registration and platform services',
            },
          },
          subscription: {
            create: {
              plan: role === Role.EMPLOYER ? SubscriptionPlan.EMPLOYER_PARTNER : SubscriptionPlan.FREE,
              priceCents: role === Role.EMPLOYER ? 4900 : 0,
            },
          },
        },
        select: authUserSelect,
      });
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('This account is not allowed to sign in.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit(user.id, AuditAction.LOGIN, 'User', user.uuid, { method: 'google-oauth' });

    return this.issueAuthResponse(user);
  }

  async completeOnboarding(userUuid: string) {
    const user = await this.prisma.user.update({
      where: { uuid: userUuid },
      data: { onboardingCompletedAt: new Date() },
      select: authUserSelect,
    });

    return { user: this.toPublicUser(user) };
  }

  async logout(userUuid: string, refreshToken?: string) {
    const user = await this.prisma.user.findUnique({
      where: { uuid: userUuid },
      select: { id: true, uuid: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication is required.');
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: refreshToken
          ? {
              userId: user.id,
              tokenHash: this.hashValue(refreshToken),
              revokedAt: null,
            }
          : { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.LOGOUT,
          entityType: 'User',
          entityUuid: user.uuid,
          details: {},
        },
      }),
    ]);
  }

  private async issueAuthResponse(
    user: AuthUser,
  ) {
    const authResponse = this.createAuthResponse(user);
    await this.persistRefreshToken(this.prisma, user.id, authResponse.refreshToken);

    return authResponse;
  }

  private createAuthResponse(user: AuthUser) {
    const publicUser = this.toPublicUser(user);
    const tokenPayload = {
      sub: user.uuid,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    const accessToken = this.tokenService.signAccess(tokenPayload);

    return {
      token: accessToken,
      accessToken,
      refreshToken: this.tokenService.signRefresh(tokenPayload),
      user: publicUser,
    };
  }

  private async persistRefreshToken(
    client: Prisma.TransactionClient | PrismaService,
    userId: number,
    refreshToken: string,
  ) {
    await client.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashValue(refreshToken),
        expiresAt: new Date(
          Date.now() + this.tokenService.refreshExpiresInSeconds() * 1000,
        ),
      },
    });
  }

  private toPublicUser(user: AuthUser) {
    // login() and changePassword() select passwordHash/failedLoginCount/lockedUntil
    // on top of authUserSelect to verify credentials, then pass that same object
    // through to here - strip them explicitly so they never reach the client,
    // regardless of which caller widened the select.
    const {
      id: _id,
      passwordHash: _passwordHash,
      failedLoginCount: _failedLoginCount,
      lockedUntil: _lockedUntil,
      ...publicUser
    } = user as AuthUser & {
      passwordHash?: string;
      failedLoginCount?: number;
      lockedUntil?: Date | null;
    };

    return publicUser;
  }

  private async createVerificationCode(user: { id: number; email: string | null; phone: string | null }) {
    const contact = this.preferredContact(user);

    if (!contact) {
      throw new BadRequestException('A verified email or phone number is required.');
    }

    const code = String(randomInt(100000, 1000000));
    await this.prisma.identityVerification.create({
      data: {
        userId: user.id,
        codeHash: this.hashValue(code),
        channel: contact.channel,
        expiresAt: this.minutesFromNow(10),
      },
    });

    const result = await this.sendToContact(contact, {
      subject: 'Verify your SkillBridge account',
      text: `Your SkillBridge verification code is ${code}. It expires in 10 minutes.`,
      html: renderBrandedEmail({
        heading: 'Verify your account',
        paragraphs: ['Use the code below to verify your SkillBridge account. It expires in 10 minutes.'],
        highlight: code,
      }),
    });

    return {
      channel: contact.channel,
      deliveryStatus: result.status,
    };
  }

  private async recordFailedLogin(
    user: { id: number; email: string | null; phone: string | null },
    currentCount: number,
  ) {
    const failedLoginCount = currentCount + 1;
    const shouldLock = failedLoginCount >= 5;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount,
        lockedUntil: shouldLock ? this.minutesFromNow(15) : null,
      },
    });

    if (shouldLock) {
      await this.sendAccountNotice(user, {
        subject: 'SkillBridge account temporarily locked',
        text: 'Your account was locked for 15 minutes after multiple failed login attempts.',
        html: renderBrandedEmail({
          heading: 'Account temporarily locked',
          paragraphs: [
            'Your account was locked for 15 minutes after multiple failed login attempts.',
            "If this wasn't you, consider resetting your password once your account unlocks.",
          ],
        }),
      });
    }
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private minutesFromNow(minutes: number) {
    return new Date(Date.now() + minutes * 60_000);
  }

  private async sendPasswordResetToken(
    user: { email: string | null; phone: string | null },
    token: string,
  ) {
    const resetLink = this.buildPasswordResetLink(token);

    return this.sendAccountNotice(user, {
      subject: 'Reset your SkillBridge password',
      text: [
        'A password reset was requested for your SkillBridge account.',
        `Use this reset token within 30 minutes: ${token}`,
        `Reset link: ${resetLink}`,
        'If you did not request this, you can ignore this message.',
      ].join('\n'),
      html: renderBrandedEmail({
        heading: 'Reset your password',
        paragraphs: [
          'A password reset was requested for your SkillBridge account.',
          `Use this reset token within 30 minutes: ${token}`,
        ],
        cta: { label: 'Reset your password', url: resetLink },
        footerNote: "If you didn't request this, you can safely ignore this email - your password won't change.",
      }),
    });
  }

  private async sendAccountNotice(
    user: { email: string | null; phone: string | null },
    message: { subject: string; text: string; html?: string },
  ) {
    const contact = this.preferredContact(user);

    if (!contact) {
      return { status: 'skipped' as const, reason: 'No email or phone number is configured.' };
    }

    return this.sendToContact(contact, message);
  }

  private async sendToContact(
    contact: ContactTarget,
    message: { subject: string; text: string; html?: string },
  ) {
    if (contact.channel === 'email') {
      return this.emailService.send({
        to: [contact.value],
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    }

    return this.whatsAppService.send({
      to: contact.value,
      text: message.text,
    });
  }

  private preferredContact(user: { email: string | null; phone: string | null }): ContactTarget | null {
    if (user.email) {
      return { channel: 'email', value: user.email };
    }

    if (user.phone) {
      return { channel: 'whatsapp', value: user.phone };
    }

    return null;
  }

  private identifierWhere(input: IdentifierInput): Prisma.UserWhereInput {
    const email = this.normalizeEmail(input.email);

    if (email) {
      return { email };
    }

    const phone = this.normalizePhone(input.phone);

    if (phone) {
      return { phone };
    }

    const identifier = input.identifier?.trim();

    if (!identifier) {
      throw new BadRequestException('Email or phone number is required.');
    }

    if (identifier.includes('@')) {
      const identifierEmail = this.normalizeEmail(identifier);

      if (!identifierEmail) {
        throw new BadRequestException('Email or phone number is required.');
      }

      return { email: identifierEmail };
    }

    const identifierPhone = this.normalizePhone(identifier);

    if (!identifierPhone) {
      throw new BadRequestException('Email or phone number is required.');
    }

    return { phone: identifierPhone };
  }

  private identifierType(input: IdentifierInput) {
    if (this.normalizeEmail(input.email)) return 'email';
    if (this.normalizePhone(input.phone)) return 'phone';
    return input.identifier?.includes('@') ? 'email' : 'phone';
  }

  private normalizeEmail(value?: string | null) {
    const normalized = value?.trim().toLowerCase();

    return normalized || null;
  }

  private normalizePhone(value?: string | null) {
    const normalized = value?.trim().replace(/[^\d+]/g, '');

    return normalized || null;
  }

  private buildPasswordResetLink(token: string) {
    const configuredUrl = process.env.PASSWORD_RESET_URL;
    const appBaseUrl = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    const baseUrl = configuredUrl ?? `${appBaseUrl}/en/reset-password`;
    const separator = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  private async audit(
    actorUserId: number,
    action: AuditAction,
    entityType: string,
    entityUuid: string,
    details: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityUuid,
        details,
      },
    });
  }
}
