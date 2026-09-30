import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoValidacion } from '@prisma/client';

export class ValidarClienteDto {
  @IsEnum(EstadoValidacion)
  @IsNotEmpty()
  estado_validacion: EstadoValidacion;

  @IsOptional()
  @IsString()
  motivo_rechazo?: string;
}