import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('registro-cliente')
  registrarCliente(@Body() dto: RegistroClienteDto) {
    return this.authService.registrarCliente(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('olvide-password')
  solicitarOlvidePassword(@Body('correo') correo: string) {
    return this.authService.solicitarRecuperacionPassword(correo);
  }

  @HttpCode(HttpStatus.OK)
  @Post('restablecer-password')
  restablecerPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.restablecerPassword(token, password);
  }
}