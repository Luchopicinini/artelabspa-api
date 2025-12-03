import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClienteProfileService } from './cliente-profile.service';
import { UpdateClienteProfileDto } from './dto/update-cliente-profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { join } from 'path';
import * as fs from 'fs';

@ApiTags('cliente-profile')
@ApiBearerAuth()
@Controller('cliente-profile')
export class ClienteProfileController {
  constructor(private readonly clienteprofileService: ClienteProfileService) {}

  @Get('me')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Obtener mi perfil' })
  async getMyProfile(@Request() req) {
    return this.clienteprofileService.findByUserId(req.user.id);
  }

  @Put('me')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Actualizar mi perfil' })
  async updateMyProfile(@Request() req, @Body() dto: UpdateClienteProfileDto) {
    return this.clienteprofileService.update(req.user.id, dto);
  }

  // 🔥🔥 SUBIR AVATAR (FASTIFY) — ESTE ES EL ENDPOINT NUEVO
  @Post('upload')
  @Roles(Role.CLIENTE)
  @ApiOperation({ summary: 'Subir avatar (Fastify)' })
  async uploadAvatar(@Request() req) {
    const file = await req.file();

    if (!file) throw new BadRequestException('Imagen requerida');

    const uploadPath = join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

    const filename = `${Date.now()}-${file.filename}`;
    const filepath = join(uploadPath, filename);

    const buffer = await file.toBuffer();
    fs.writeFileSync(filepath, buffer);

    return {
      success: true,
      imageUrl: `/uploads/avatars/${filename}`,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.clienteprofileService.findAll();
  }

  @Get(':userId')
  @Roles(Role.ADMIN)
  async findByUserId(@Param('userId') userId: string) {
    return this.clienteprofileService.findByUserId(userId);
  }
}
