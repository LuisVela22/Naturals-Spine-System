import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoDocumento } from '@prisma/client';

export class VincularDocumentoDto {
  @IsEnum(TipoDocumento)
  @IsNotEmpty()
  tipo_documento: TipoDocumento;

  @IsOptional()
  @IsUUID()
  orden_id?: string;

  @IsString()
  @IsNotEmpty()
  nombre_archivo: string;

  @IsString()
  @IsNotEmpty()
  mime_type: string;

  @IsNumber()
  tamano_bytes: number;
}