import { IsNotEmpty, IsString } from 'class-validator';
import { VincularDocumentoDto } from './vincular-documento.dto';

export class ConfirmarCargaDto extends VincularDocumentoDto {
  @IsString()
  @IsNotEmpty()
  rutaGcs: string;
}
