import { Module } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { DocumentosModule } from '../documentos/documentos.module';

@Module({
  imports: [NotificacionesModule, DocumentosModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
