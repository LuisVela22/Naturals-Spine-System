import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { OrdenesService } from './ordenes.service';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { CambiarEstadoOrdenDto } from './dto/cambiar-estado-orden.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('ordenes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrdenesController {
  constructor(private ordenesService: OrdenesService) {}

  @Post()
  @Roles(Rol.CLIENTE)
  crear(@Req() req: any, @Body() dto: CrearOrdenDto) {
    return this.ordenesService.crear(req.user.id, dto);
  }

  @Get()
  consultar(@Req() req: any) {
    return this.ordenesService.consultarHistorial(req.user);
  }

  @Get('notificaciones')
  @Roles(Rol.ADMIN)
  consultarNotificaciones() {
    return this.ordenesService.consultarNotificaciones();
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMIN)
  cambiarEstado(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CambiarEstadoOrdenDto,
  ) {
    return this.ordenesService.transicionarEstado(id, req.user.id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string, @Req() req: any) {
    return this.ordenesService.eliminarConcluida(id, req.user);
  }

  @Post(':id/cancelar')
  @Roles(Rol.CLIENTE)
  cancelar(@Param('id') id: string, @Req() req: any) {
    return this.ordenesService.cancelarPorCliente(id, req.user.id);
  }

  @Post(':id/aclaracion-renta')
  @Roles(Rol.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  enviarAclaracionRenta(@Param('id') id: string, @Req() req: any, @Body('detalles') detalles: string, @UploadedFile() file?: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    return this.ordenesService.enviarAclaracionRenta(id, req.user.id, detalles, file);
  }
}
