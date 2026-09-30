import { Controller, Post, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
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

  @Patch(':id/estado')
  @Roles(Rol.ADMIN)
  cambiarEstado(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CambiarEstadoOrdenDto,
  ) {
    return this.ordenesService.transicionarEstado(id, req.user.id, dto);
  }
}