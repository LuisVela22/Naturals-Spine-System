import { IsEmail, IsNotEmpty, IsString, Length, MinLength, IsArray, IsOptional, IsUUID } from 'class-validator';

export class RegistroClienteDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo_electronico: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe contener al menos 8 caracteres' })
  password: string;

  @IsString()
  @Length(12, 13, { message: 'El RFC debe tener entre 12 y 13 caracteres' })
  rfc: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  razon_social: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de contacto es obligatorio' })
  nombre_contacto: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección fiscal es obligatoria' })
  direccion_fiscal: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada documento_id debe ser un UUID válido' })
  documentos_ids?: string[];
}