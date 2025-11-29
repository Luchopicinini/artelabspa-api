import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { PromocionService } from './promocion.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('Promocion')
@ApiBearerAuth('JWT-auth')
@Controller('promocion')
export class PromocionController {
  constructor(
    private readonly promocionService: PromocionService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo Promocion' })
  @ApiBody({ type: CreatePromocionDto })
  @ApiResponse({ status: 201, description: 'Promocion creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createPromocionDto: CreatePromocionDto) {
    const data = await this.promocionService.create(createPromocionDto);
    return {
      success: true,
      message: 'Promocion creado exitosamente',
      data,
    };
  }

  @Post(':id/upload-image')
  @ApiOperation({ summary: 'Subir imagen para Promocion' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del Promocion' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Imagen subida exitosamente' })
  @ApiResponse({ status: 404, description: 'Promocion no encontrado' })
  async uploadImage(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
    // Obtener archivo de Fastify
    const data = await request.file();

    if (!data) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!data.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo debe ser una imagen');
    }

    const buffer = await data.toBuffer();
    const file = {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
    } as Express.Multer.File;

    const uploadResult = await this.uploadService.uploadImage(file);
    const updated = await this.promocionService.update(id, {
      imagen: uploadResult.url,
      imagenThumbnail: uploadResult.thumbnailUrl,
    });
    return {
      success: true,
      message: 'Imagen subida y asociada exitosamente',
      data: { promocion: updated, upload: uploadResult },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los Promocions' })
  @ApiResponse({ status: 200, description: 'Lista de Promocions' })
  async findAll() {
    const data = await this.promocionService.findAll();
    return { success: true, data, total: data.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener Promocion por ID' })
  @ApiParam({ name: 'id', description: 'ID del Promocion' })
  @ApiResponse({ status: 200, description: 'Promocion encontrado' })
  @ApiResponse({ status: 404, description: 'Promocion no encontrado' })
  async findOne(@Param('id') id: string) {
    const data = await this.promocionService.findOne(id);
    return { success: true, data };
  }

  @Get('activas')
  @ApiOperation({ summary: 'Promociones activas' })
  async findActivas() {
    const data = await this.promocionService.findActivas();
    return { success: true, data, total: data.length };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar Promocion' })
  @ApiParam({ name: 'id', description: 'ID del Promocion' })
  @ApiBody({ type: UpdatePromocionDto })
  @ApiResponse({ status: 200, description: 'Promocion actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Promocion no encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updatePromocionDto: UpdatePromocionDto
  ) {
    const data = await this.promocionService.update(id, updatePromocionDto);
    return {
      success: true,
      message: 'Promocion actualizado exitosamente',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar Promocion' })
  @ApiParam({ name: 'id', description: 'ID del Promocion' })
  @ApiResponse({ status: 200, description: 'Promocion eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Promocion no encontrado' })
  async remove(@Param('id') id: string) {
    const promocion = await this.promocionService.findOne(id);
    if (promocion.imagen) {
      const filename = promocion.imagen.split('/').pop();
      if (filename) {
      await this.uploadService.deleteImage(filename);
      }
    }
    await this.promocionService.remove(id);
    return { success: true, message: 'Promocion eliminado exitosamente' };
  }
}
