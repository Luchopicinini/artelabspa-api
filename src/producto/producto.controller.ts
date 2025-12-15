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
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UploadService } from '../upload/upload.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '../auth/enums/roles.enum';

@ApiTags('Producto')
@ApiBearerAuth('JWT-auth')
@Controller('producto')
export class ProductoController {
  constructor(
    private readonly productoService: ProductoService,
    private readonly uploadService: UploadService,
  ) {}

  // 🟢 CREAR PRODUCTO → ADMIN y VENDEDOR
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo Producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  async create(@Body() createProductoDto: CreateProductoDto) {
    const data = await this.productoService.create(createProductoDto);
    return {
      success: true,
      message: 'Producto creado exitosamente',
      data,
    };
  }

  // 🟢 SUBIR IMAGEN → ADMIN y VENDEDOR
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENDEDOR)
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
  async uploadImage(
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ) {
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

  // 🟢 LISTAR PRODUCTOS → PÚBLICO (CLIENTE + INVITADO)
  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar todos los Productos' })
  @ApiResponse({ status: 200, description: 'Lista de Productos' })
  async findAll() {
    const data = await this.productoService.findAll();
    return { success: true, data, total: data.length };
  }

  // 🟢 VER PRODUCTO POR ID → PÚBLICO
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener Producto por ID' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
  async findOne(@Param('id') id: string) {
    const data = await this.productoService.findOne(id);
    return { success: true, data };
  }

  // 🟢 PRODUCTOS POR CATEGORÍA → PÚBLICO
  @Public()
  @Get('categoria/:categoriaId')
  @ApiOperation({ summary: 'Productos de arte por categoría' })
  async findByCategoria(@Param('categoriaId') categoriaId: string) {
    const data = await this.productoService.findByCategoria(categoriaId);
    return { success: true, data, total: data.length };
  }

  // 🟡 ACTUALIZAR PRODUCTO → ADMIN y VENDEDOR
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.VENDEDOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar Producto' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
  async update(
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    const data = await this.productoService.update(id, updateProductoDto);
    return {
      success: true,
      message: 'Producto actualizado exitosamente',
      data,
    };
  }

  // 🔴 ELIMINAR PRODUCTO → SOLO ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar Producto' })
  @ApiParam({ name: 'id', description: 'ID del Producto' })
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
