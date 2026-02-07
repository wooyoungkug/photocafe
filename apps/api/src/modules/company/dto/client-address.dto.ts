import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateClientAddressDto {
  @ApiPropertyOptional({ description: '배송지 별칭' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  addressName?: string;

  @ApiProperty({ description: '수령인 이름' })
  @IsString()
  @MaxLength(100)
  recipientName: string;

  @ApiProperty({ description: '연락처' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: '우편번호' })
  @IsString()
  @MaxLength(10)
  postalCode: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ description: '상세주소' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressDetail?: string;

  @ApiPropertyOptional({ description: '기본 배송지 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateClientAddressDto extends PartialType(CreateClientAddressDto) {}
