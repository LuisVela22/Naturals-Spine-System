import { Module } from '@nestjs/common';
import { DocumentosService } from './documentos.service';
import { DocumentosController } from './documentos.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  controllers: [DocumentosController],
  imports: [NotificacionesModule],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
