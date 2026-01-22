import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  function makeSut(params?: { allowRoleSelection?: boolean }) {
    const users = {
      findByEmail: jest.fn(),
      create: jest.fn()
    } as unknown as UsersService;

    const jwt = {
      signAsync: jest.fn().mockResolvedValue('token')
    } as unknown as JwtService;

    const config = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'AUTH_ALLOW_PROVIDER_SELECTION') return params?.allowRoleSelection === false ? 'false' : 'true';
        if (key === 'JWT_SECRET') return 'test';
        if (key === 'JWT_EXPIRES_IN') return '1d';
        return undefined;
      })
    } as unknown as ConfigService;

    const sut = new AuthService(users, jwt, config);
    return { sut, users, jwt };
  }

  describe('register', () => {
    it('defaults role to BUYER when not provided', async () => {
      const { sut, users, jwt } = makeSut({ allowRoleSelection: true });
      (users.findByEmail as any).mockResolvedValue(null);
      (users.create as any).mockResolvedValue({ id: 'u1', email: 'a@b.com', role: Role.BUYER, password: 'x' });

      const res = await sut.register({ email: 'a@b.com', password: 'Password123' });

      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'a@b.com',
          role: Role.BUYER
        })
      );
      expect(jwt.signAsync).toHaveBeenCalled();
      expect(res.user.role).toBe(Role.BUYER);
      expect(res.access_token).toBe('token');
    });

    it('throws if email already registered', async () => {
      const { sut, users } = makeSut({ allowRoleSelection: true });
      (users.findByEmail as any).mockResolvedValue({ id: 'u1' });

      await expect(sut.register({ email: 'a@b.com', password: 'Password123', role: Role.BUYER })).rejects.toBeInstanceOf(
        ForbiddenException
      );
    });

    it('never allows ADMIN registration', async () => {
      const { sut, users } = makeSut({ allowRoleSelection: true });
      (users.findByEmail as any).mockResolvedValue(null);

      await expect(
        sut.register({ email: 'a@b.com', password: 'Password123', role: Role.ADMIN })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('blocks PROVIDER when provider registration is disabled', async () => {
      const { sut, users } = makeSut({ allowRoleSelection: false });
      (users.findByEmail as any).mockResolvedValue(null);

      await expect(
        sut.register({ email: 'a@b.com', password: 'Password123', role: Role.PROVIDER })
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('still allows BUYER when provider registration is disabled', async () => {
      const { sut, users } = makeSut({ allowRoleSelection: false });
      (users.findByEmail as any).mockResolvedValue(null);
      (users.create as any).mockResolvedValue({ id: 'u1', email: 'a@b.com', role: Role.BUYER, password: 'x' });

      const res = await sut.register({ email: 'a@b.com', password: 'Password123', role: Role.BUYER });
      expect(res.user.role).toBe(Role.BUYER);
    });
  });

  describe('login', () => {
    it('throws Unauthorized when user not found', async () => {
      const { sut, users } = makeSut({ allowRoleSelection: true });
      (users.findByEmail as any).mockResolvedValue(null);

      await expect(sut.login({ email: 'a@b.com', password: 'Password123' })).rejects.toBeInstanceOf(
        UnauthorizedException
      );
    });
  });
});

