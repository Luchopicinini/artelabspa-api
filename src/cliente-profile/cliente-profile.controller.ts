import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  BadRequestException,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClienteProfileService } from './cliente-profile.service';
import { UpdateClienteProfileDto } from './dto/update-cliente-profile.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/roles.enum';
import { FileInterceptor } from '@nestjs/platform-express';

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

  // 🔥 NUEVO → Subir imagen del avatar
  @Post('upload')
  @Roles(Role.CLIENTE)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Subir imagen del avatar' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('La imagen es requerida');
    }

    const imageUrl = `https://artelabspa-api.onrender.com/uploads/avatars/${file.filename}`;

    return {
      success: true,
      imageUrl,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos los perfiles (Admin)' })
  async findAll() {
    return this.clienteprofileService.findAll();
  }

  @Get(':userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener perfil por userId (Admin)' })
  async findByUserId(@Param('userId') userId: string) {
    return this.clienteprofileService.findByUserId(userId);
  }
}
