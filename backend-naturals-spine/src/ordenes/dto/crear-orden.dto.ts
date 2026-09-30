import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { TipoOrden } from '@prisma/client';

export class CrearOrdenDto {
  @IsEnum(TipoOrden)
  @IsNotEmpty()
  tipo_orden: TipoOrden;

  @IsString()
  @IsNotEmpty()
  descripcion_equipo: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto_total?: number;
}