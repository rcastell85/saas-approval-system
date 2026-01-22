import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  async function makeSut() {
    const authService = {
      register: jest.fn(),
      login: jest.fn()
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }]
    }).compile();

    const controller = moduleRef.get(AuthController);
    return { controller, authService };
  }

  it('register forwards dto to AuthService.register', async () => {
    const { controller, authService } = await makeSut();
    (authService.register as any).mockResolvedValue({ access_token: 't' });

    await controller.register({ email: 'a@b.com', password: 'Password123', role: Role.BUYER });

    expect(authService.register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'Password123',
      role: Role.BUYER
    });
  });

  it('login forwards dto to AuthService.login', async () => {
    const { controller, authService } = await makeSut();
    (authService.login as any).mockResolvedValue({ access_token: 't' });

    await controller.login({ email: 'a@b.com', password: 'Password123' });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'Password123'
    });
  });

  it('me returns req.user', async () => {
    const { controller } = await makeSut();
    const req = { user: { userId: 'u1', role: Role.BUYER } };
    expect(controller.me(req)).toEqual(req.user);
  });

  it('adminOnly returns ok: true', async () => {
    const { controller } = await makeSut();
    expect(controller.adminOnly()).toEqual({ ok: true });
  });
});

