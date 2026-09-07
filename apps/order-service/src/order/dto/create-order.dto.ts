import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderLineItemDto {
  @IsString()
  @MaxLength(128)
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsPositive()
  unitPrice: number;
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(128)
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  items: OrderLineItemDto[];
}
