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
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('Producto')
@ApiBearerAuth('JWT-auth')
@Controller('producto')
export class ProductoController {
  constructor(
    private readonly productoService: ProductoService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo Producto' })
  @ApiBody({ type: CreateProductoDto })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() createProductoDto: CreateProductoDto) {
    const data = await this.productoService.create(createProductoDto);
    return {
      success: true,
      message: 'Producto creado exitosamente',
      data,
    };
  }

  @Post(':id/upload-image')
  @ApiOperation({ summary: 'Subir imagen para Producto' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID del Producto' })
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
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
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
    const updated = await this.productoService.update(id, {
      imagen: uploadResult.url,
      imagenThumbnail: uploadResult.thumbnailUrl,
    });
    return {
      success: true,
      message: 'Imagen subida y asociada exitosamente',
      data: { producto: updated, upload: uploadResult },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los Productos' })
  @ApiResponse({ status: 200, description: 'Lista de Productos' })
  async findAll() {
    const data = await this.productoService.findAll();
    return { success: true, data, total: data.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener Producto por ID' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async findOne(@Param('id') id: string) {
    const data = await this.productoService.findOne(id);
    return { success: true, data };
  }

  @Get('categoria/:categoriaId')
  @ApiOperation({ summary: 'Productos de arte por categoría' })
  async findByCategoria(@Param('categoriaId') categoriaId: string) {
    const data = await this.productoService.findByCategoria(categoriaId);
    return { success: true, data, total: data.length };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar Producto' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
  @ApiBody({ type: UpdateProductoDto })
  @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async update(
    @Param('id') id: string, 
    @Body() updateProductoDto: UpdateProductoDto
  ) {
    const data = await this.productoService.update(id, updateProductoDto);
    return {
      success: true,
      message: 'Producto actualizado exitosamente',
      data,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar Producto' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
  @ApiResponse({ status: 200, description: 'Producto eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  async remove(@Param('id') id: string) {
    const producto = await this.productoService.findOne(id);
    if (producto.imagen) {
      const filename = producto.imagen.split('/').pop();
      if (filename) {
      await this.uploadService.deleteImage(filename);
      }
    }
    await this.productoService.remove(id);
    return { success: true, message: 'Producto eliminado exitosamente' };
  }
}
