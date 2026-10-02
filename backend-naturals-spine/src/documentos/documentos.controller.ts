import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentosService } from './documentos.service';
import { VincularDocumentoDto } from './dto/vincular-documento.dto';

@Controller('documentos')
@UseGuards(AuthGuard('jwt'))
export class DocumentosController {
  constructor(private documentosService: DocumentosService) {}

  @Post('solicitar-subida')
  solicitarUrlSubida(@Req() req: any, @Body() dto: VincularDocumentoDto) {
    return this.documentosService.generarUrlSubida(req.user, dto);
  }

  @Post('subir-local')
  @UseInterceptors(FileInterceptor('file'))
  subirLocal(
    @Req() req: any,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body('tipo_documento') tipo_documento: string,
    @Body('orden_id') orden_id?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo.');
    }

    return this.documentosService.subirLocal(req.user, {
      tipo_documento: tipo_documento as any,
      orden_id,
      nombre_archivo: file.originalname,
      mime_type: file.mimetype,
      tamano_bytes: file.size,
    }, file);
  }

  @Post('confirmar')
  confirmarCarga(
    @Req() req: any,
    @Body('rutaGcs') rutaGcs: string,
    @Body() dto: VincularDocumentoDto,
  ) {
    return this.documentosService.confirmarCarga(req.user.id, rutaGcs, dto);
  }

  @Get('orden/:ordenId')
  obtenerPorOrden(@Param('ordenId') ordenId: string) {
    return this.documentosService.obtenerPorOrden(ordenId);
  }

  @Get(':id/descarga')
  descargarDocumento(@Param('id') id: string) {
    return this.documentosService.generarUrlDescarga(id);
  }

  @Get(':id/archivo-local')
  async archivoLocal(@Param('id') id: string, @Res() res: Response) {
    const archivo = await this.documentosService.obtenerArchivoLocal(id);
    res.setHeader('Content-Type', archivo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(archivo.nombreArchivo)}"`);
    return res.sendFile(archivo.filePath);
  }
}
