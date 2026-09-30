import { Module } from '@nestjs/common';
import { OrdenesService } from './ordenes.service';
import { OrdenesController } from './ordenes.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [AuthModule, NotificacionesModule],
  controllers: [OrdenesController],
  providers: [OrdenesService],
})
export class OrdenesModule {}