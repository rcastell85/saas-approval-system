import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  /**
   * Feature flag: allow buyers to self-register as PROVIDER.
   * BUYER registration is always allowed.
   * ADMIN registration is never allowed via public register endpoint.
   */
  private allowProviderRegistration(): boolean {
    const raw = (
      this.config.get<string>('AUTH_ALLOW_PROVIDER_SELECTION') ??
      // backward-compatible fallback
      this.config.get<string>('AUTH_ALLOW_ROLE_SELECTION') ??
      'true'
    ).toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes';
  }

  async register(params: { email: string; password: string; role?: Role }) {
    const existing = await this.users.findByEmail(params.email);
    if (existing) throw new ForbiddenException('Email already registered');

    const requestedRole = params.role ?? Role.BUYER;

    // Never allow ADMIN via public registration
    if (requestedRole === Role.ADMIN) {
      throw new ForbiddenException('Admin registration is disabled');
    }

    // Only gate PROVIDER behind the feature flag
    if (requestedRole === Role.PROVIDER && !this.allowProviderRegistration()) {
      throw new ForbiddenException('Provider registration is disabled');
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const user = await this.users.create({
      email: params.email,
      passwordHash,
      role: requestedRole
    });

    const access_token = await this.jwt.signAsync({ sub: user.id, role: user.role });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      access_token
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.users.findByEmail(params.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(params.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const access_token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { access_token };
  }
}

