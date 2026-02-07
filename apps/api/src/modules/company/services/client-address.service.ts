import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateClientAddressDto, UpdateClientAddressDto } from '../dto/client-address.dto';

const MAX_ADDRESSES_PER_CLIENT = 10;

@Injectable()
export class ClientAddressService {
  constructor(private prisma: PrismaService) {}

  async findAll(clientId: string) {
    return this.prisma.clientAddress.findMany({
      where: { clientId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(clientId: string, addressId: string) {
    const address = await this.prisma.clientAddress.findFirst({
      where: { id: addressId, clientId },
    });
    if (!address) {
      throw new NotFoundException('배송지를 찾을 수 없습니다');
    }
    return address;
  }

  async create(clientId: string, dto: CreateClientAddressDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');

    const count = await this.prisma.clientAddress.count({ where: { clientId } });
    if (count >= MAX_ADDRESSES_PER_CLIENT) {
      throw new BadRequestException(`최대 ${MAX_ADDRESSES_PER_CLIENT}개까지 배송지를 등록할 수 있습니다`);
    }

    const isFirstAddress = count === 0;
    const shouldBeDefault = isFirstAddress || dto.isDefault === true;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.clientAddress.updateMany({
          where: { clientId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.clientAddress.create({
        data: { clientId, ...dto, isDefault: shouldBeDefault },
      });
    });
  }

  async update(clientId: string, addressId: string, dto: UpdateClientAddressDto) {
    await this.findOne(clientId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.clientAddress.updateMany({
          where: { clientId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.clientAddress.update({ where: { id: addressId }, data: dto });
    });
  }

  async delete(clientId: string, addressId: string) {
    const address = await this.findOne(clientId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await tx.clientAddress.delete({ where: { id: addressId } });

      if (address.isDefault) {
        const nextAddress = await tx.clientAddress.findFirst({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
        });
        if (nextAddress) {
          await tx.clientAddress.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }
      return address;
    });
  }

  async setDefault(clientId: string, addressId: string) {
    await this.findOne(clientId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await tx.clientAddress.updateMany({
        where: { clientId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.clientAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
