import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientesService } from './clientes.service';
import { ValidarClienteDto } from './dto/validar-cliente.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('clientes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClientesController {
  constructor(private clientesService: ClientesService) {}

  @Get('estadisticas')
  @Roles(Rol.ADMIN)
  obtenerEstadisticas() {
    return this.clientesService.obtenerEstadisticasAdmin();
  }

  @Get('pendientes')
  @Roles(Rol.ADMIN)
  obtenerPendientes() {
    return this.clientesService.listarPendientes();
  }

  @Patch(':id/validacion')
  @Roles(Rol.ADMIN)
  evaluarCliente(
    @Param('id') id: string,
    @Body() dto: ValidarClienteDto,
  ) {
    return this.clientesService.resolverValidacion(id, dto);
  }
}