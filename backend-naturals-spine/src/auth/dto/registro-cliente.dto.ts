import { IsEmail, IsNotEmpty, IsString, Length, MinLength, IsArray, IsOptional, IsUUID, Matches } from 'class-validator';

export class RegistroClienteDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo_electronico: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe contener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,\/@&_$-])[A-Za-z\d.,\/@&_$-]{8,}$/, { message: 'La contraseña requiere minúscula, mayúscula, número y un carácter especial permitido: . , / @ & - _ $' })
  password: string;

  @IsString()
  @Length(12, 13, { message: 'El RFC debe tener entre 12 y 13 caracteres' })
  @Matches(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, { message: 'El RFC no tiene un formato válido' })
  rfc: string;

  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  razon_social: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de contacto es obligatorio' })
  nombre_contacto: string;

  @IsString()
  @Matches(/^\+\d{8,18}$/, { message: 'El teléfono debe incluir código internacional y entre 8 y 18 dígitos en total' })
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección fiscal es obligatoria' })
  direccion_fiscal: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Cada documento_id debe ser un UUID válido' })
  documentos_ids?: string[];
}