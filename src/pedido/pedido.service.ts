import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { Pedido, PedidoDocument } from './schemas/pedido.schema';
import { ClienteProfileService } from '../cliente-profile/cliente-profile.service';
import { ProductoService } from '../producto/producto.service';

import { PromocionService } from '../promocion/promocion.service';

@Injectable()
export class PedidoService {
  constructor(
    @InjectModel(Pedido.name) private pedidoModel: Model<PedidoDocument>,
    private clienteProfileService: ClienteProfileService,
    private productoService: ProductoService,
    private promocionService: PromocionService,
  ) {}

  async create(createPedidoDto: CreatePedidoDto, userId: string): Promise<Pedido> {
    let clienteId: string;

    // 1. Determinar el cliente
    if (createPedidoDto.cliente) {
      // Si se especificó un cliente (caso ADMIN), usarlo directamente
      clienteId = createPedidoDto.cliente;
    } else {
      // Si no, buscar el ClienteProfile del usuario autenticado
      const clienteProfile = await this.clienteProfileService.findByUserId(userId);
      clienteId = (clienteProfile as any)._id.toString();
    }

    // 2. Buscar cada producto y calcular precio
    const itemsConPrecio = await Promise.all(
      createPedidoDto.items.map(async (item) => {
        const producto = await this.productoService.findOne(item.producto);
        return {
          producto: new Types.ObjectId(item.producto),
          cantidad: item.cantidad,
          precio: producto.precio, // Usar el precio actual del producto
        };
      })
    );

    // 3. Calcular total inicial
    let total = itemsConPrecio.reduce(
      (sum, item) => sum + item.precio * item.cantidad,
      0
    );

    // 4. Aplicar promociones
    const promociones = await this.promocionService.findActivas();
    
    for (const promo of promociones) {
      if (promo.productos && promo.productos.length > 0) {
        // Promoción específica para ciertos productos
        for (const item of itemsConPrecio) {
          // Verificar si el producto del item está en la lista de promoción
          // promo.productos puede ser array de ObjectId o strings, asegurar comparación
          const isIncluded = promo.productos.some(p => p.toString() === item.producto.toString());
          
          if (isIncluded) {
            const descuentoItem = item.precio * (promo.descuento / 100) * item.cantidad;
            total -= descuentoItem;
          }
        }
      } else {
        // Promoción global
        const descuentoGlobal = total * (promo.descuento / 100);
        total -= descuentoGlobal;
      }
    }

    // Asegurar que total no sea negativo
    total = Math.max(0, total);

    // 5. Crear el pedido
    const nuevoPedido = await this.pedidoModel.create({
      cliente: new Types.ObjectId(clienteId),
      items: itemsConPrecio,
      total,
      direccionEntrega: createPedidoDto.direccionEntrega,
      notasEntrega: createPedidoDto.notasEntrega,
    });

    return nuevoPedido;
  }

  async findAll(): Promise<Pedido[]> {
    const pedidos = await this.pedidoModel.find();
    return pedidos;
  }

  async findOne(id: string | number): Promise<Pedido> {
    const pedido = await this.pedidoModel.findById(id)
    .populate('cliente', 'nombre email telefono')
    .populate('items.producto', 'nombre precio imagen');
    if (!pedido) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    return pedido;
  }

  async findByCliente(clienteId: string): Promise<Pedido[]> {
    return this.pedidoModel.find({ cliente: new Types.ObjectId(clienteId) })
      .sort({ createdAt: -1 })
      .populate('items.producto', 'nombre precio imagen');
  }

  async findMyPedidos(userId: string): Promise<Pedido[]> {
    const clienteProfile = await this.clienteProfileService.findByUserId(userId);
    const clienteId = (clienteProfile as any)._id.toString();
    return this.findByCliente(clienteId);
  }

  async update(id: string | number, updatePedidoDto: UpdatePedidoDto): Promise<Pedido> {
    const pedido = await this.pedidoModel.findByIdAndUpdate(id, updatePedidoDto, { new: true })
    .populate('cliente', 'nombre email telefono');
    if (!pedido) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    return pedido;
  }

  async remove(id: string | number): Promise<void> {
    const result = await this.pedidoModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
  }
}
