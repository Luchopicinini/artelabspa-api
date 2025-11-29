import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClienteProfile, ClienteProfileDocument } from './schemas/cliente-profile.schema';
import { CreateClienteProfileDto } from './dto/create-cliente-profile.dto';
import { UpdateClienteProfileDto } from './dto/update-cliente-profile.dto';

@Injectable()
export class ClienteProfileService {
  constructor(
    @InjectModel(ClienteProfile.name) private clienteprofileModel: Model<ClienteProfileDocument>,
  ) {}

  async create(userId: string, dto: CreateClienteProfileDto): Promise<ClienteProfile> {
    const profile = await this.clienteprofileModel.create({
      user: new Types.ObjectId(userId),
      ...dto,
    });
    return profile;
  }

  async findByUserId(userId: string): Promise<ClienteProfile | null> {
    return this.clienteprofileModel.findOne({ user: new Types.ObjectId(userId) }).populate('user', 'email role').exec();
  }

  async findAll(): Promise<ClienteProfile[]> {
    return this.clienteprofileModel.find().populate('user', 'email role').exec();
  }

  async update(userId: string, dto: UpdateClienteProfileDto): Promise<ClienteProfile> {
    const profile = await this.clienteprofileModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId) },
      { $set: dto },
      { new: true },
    );
    if (!profile) {
      throw new NotFoundException('Profile no encontrado');
    }
    return profile;
  }

  async delete(userId: string): Promise<void> {
    const result = await this.clienteprofileModel.deleteOne({ user: new Types.ObjectId(userId) });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Profile no encontrado');
    }
  }
}
