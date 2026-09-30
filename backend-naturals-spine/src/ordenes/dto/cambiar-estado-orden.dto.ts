import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoOrden } from '@prisma/client';

export class CambiarEstadoOrdenDto {
  @IsEnum(EstadoOrden)
  @IsNotEmpty()
  nuevo_estado: EstadoOrden;

  @IsOptional()
  @IsString()
  comentario?: string;
}