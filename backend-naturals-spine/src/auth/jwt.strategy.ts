import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET must be configured'); })(),
    });
  }

  async validate(payload: { sub: string; email: string; rol: string }) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { cliente: true, personal: true },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o credenciales inválidas');
    }

    return user;
  }
}
