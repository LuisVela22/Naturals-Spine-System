import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { OrdenesController } from './ordenes.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { DocumentosModule } from '../documentos/documentos.module';

@Module({
  imports: [AuthModule, NotificacionesModule, DocumentosModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}
