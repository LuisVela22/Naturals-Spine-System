import { Controller, Post, Patch, Body, HttpCode, HttpStatus, UseInterceptors, UploadedFiles, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('registro-cliente')
  @UseInterceptors(AnyFilesInterceptor())
  registrarCliente(@Body() dto: RegistroClienteDto, @UploadedFiles() files: Array<{ fieldname: string; originalname: string; mimetype: string; size: number; buffer: Buffer }>) {
    const documentos = files || [];
    const requeridos = ['documento_rfc', 'documento_ine', 'documento_domicilio'];
    if (requeridos.some((campo) => !documentos.some((file) => file.fieldname === campo))) {
      throw new BadRequestException('Adjunte la constancia fiscal, identificación oficial y comprobante de domicilio.');
    }
    return this.authService.registrarCliente(dto, documentos);
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

  @Patch('modo-oscuro')
  @UseGuards(AuthGuard('jwt'))
  actualizarModoOscuro(@Req() req: any, @Body('modo_oscuro') modoOscuro: boolean) {
    return this.authService.actualizarModoOscuro(req.user.id, Boolean(modoOscuro));
  }
}
