import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientesModule } from './clientes/clientes.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientesModule,
    OrdenesModule,
    DocumentosModule,
    NotificacionesModule,
  ],
})
export class AppModule {}