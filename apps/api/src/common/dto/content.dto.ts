import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductAvailability } from '@nexora/shared-types';

const https = {
  protocols: ['https'],
  require_protocol: true,
  require_tld: true,
};
export class ProductImageRequest {
  @IsUrl(https) @MaxLength(2048) url!: string;
  @IsOptional() @IsString() @MaxLength(300) altText?: string;
  @IsInt() @Min(0) @Max(20) order!: number;
}
export class CreateProductRequest {
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) price!: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  compareAtPrice?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ProductAvailability) availability?: ProductAvailability;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductImageRequest)
  images?: ProductImageRequest[];
}
export class UpdateProductRequest {
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true })
  @Type(() => ProductImageRequest) images?: ProductImageRequest[];
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  price?: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  compareAtPrice?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsEnum(ProductAvailability) availability?: ProductAvailability;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}
export class CreateCategoryRequest {
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
}
export class CreateServiceRequest {
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  price?: number;
  @IsOptional() @IsString() @MaxLength(150) priceLabel?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl(https, { each: true })
  @MaxLength(2048, { each: true })
  images?: string[];
}
export class UpdateServiceRequest {
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUrl(https, { each: true })
  @MaxLength(2048, { each: true }) images?: string[];
  @IsOptional() @IsString() @Length(1, 160) name?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  price?: number;
  @IsOptional() @IsString() @MaxLength(150) priceLabel?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}
export class CreateLeadRequest {
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsString() @Length(1, 160) name!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsString() @Length(1, 5000) message!: string;
  @IsString() @Length(1, 100) source!: string;
}
export class TrackClickRequest {
  @IsOptional() @IsString() @Length(1, 100) source?: string;
}
export class ThemeRequest {
  @IsString() @Length(1, 40) theme!: string;
  @IsObject() colorPalette!: Record<string, string>;
  @IsObject() typography!: Record<string, string>;
}
export class SectionsRequest {
  // Prevent implicit Array conversion of each plain section object. The service
  // performs bounded recursive validation before any persistence operation.
  @IsArray() @ArrayMaxSize(30) @Type(() => Object) sections!: unknown[];
}
export class DomainRequest {
  @IsString() @Length(1, 253) customDomain!: string;
}
