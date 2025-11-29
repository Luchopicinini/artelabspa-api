import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { Promocion, PromocionDocument } from './schemas/promocion.schema';

@Injectable()
export class PromocionService {
  constructor(
    @InjectModel(Promocion.name) private promocionModel: Model<PromocionDocument>,
  ) {}

  async create(createPromocionDto: CreatePromocionDto): Promise<Promocion> {
    const nuevoPromocion = await this.promocionModel.create(createPromocionDto);
    return nuevoPromocion;
  }

  async findAll(): Promise<Promocion[]> {
    const promocions = await this.promocionModel.find();
    return promocions;
  }

  async findOne(id: string | number): Promise<Promocion> {
    const promocion = await this.promocionModel.findById(id);
    if (!promocion) {
      throw new NotFoundException(`Promocion con ID ${id} no encontrado`);
    }
    return promocion;
  }

  async update(id: string | number, updatePromocionDto: UpdatePromocionDto): Promise<Promocion> {
    const promocion = await this.promocionModel.findByIdAndUpdate(id, updatePromocionDto, { new: true });
    if (!promocion) {
      throw new NotFoundException(`Promocion con ID ${id} no encontrado`);
    }
    return promocion;
  }

  async remove(id: string | number): Promise<void> {
    const result = await this.promocionModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Promocion con ID ${id} no encontrado`);
    }
  }
  async findActivas(): Promise<Promocion[]> {
    const now = new Date();
    return this.promocionModel.find({
      activa: true,
      fechaInicio: { $lte: now },
      fechaFin: { $gte: now },
    });
  }

}
