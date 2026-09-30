import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
}