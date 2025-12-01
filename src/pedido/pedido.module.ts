import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PedidoService } from './pedido.service';
import { PedidoController } from './pedido.controller';
import { UploadModule } from '../upload/upload.module';
import { Pedido, PedidoSchema } from './schemas/pedido.schema';
import { ClienteProfileModule } from '../cliente-profile/cliente-profile.module';
import { ProductoModule } from '../producto/producto.module';

import { PromocionModule } from '../promocion/promocion.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pedido.name, schema: PedidoSchema }]),
    UploadModule,
    ClienteProfileModule,
    ProductoModule,
    PromocionModule,
  ],
  controllers: [PedidoController],
  providers: [PedidoService],
  exports: [PedidoService],
})
export class PedidoModule {}
