import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches } from 'class-validator';
import { TipoOrden } from '@prisma/client';

export class CrearOrdenDto {
  @IsEnum(TipoOrden)
  @IsNotEmpty()
  tipo_orden: TipoOrden;

  @IsString()
  @IsNotEmpty()
  descripcion_equipo: string;

  @IsOptional()
  @IsDateString()
  fecha_requerida?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hora_requerida?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsString()
  medico_cirujano?: string;

  @IsOptional()
  @IsString()
  responsable_recepcion?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monto_total?: number;
}
