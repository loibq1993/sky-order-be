import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';

export enum UploadFolder {
    TEMP = 'temp',
    PRODUCTS = 'products',
    CATEGORIES = 'categories',
    ORDERS = 'orders'
}

export class UploadImageDto {
    @ApiProperty({
        description: 'Folder lưu ảnh',
        enum: UploadFolder,
        default: UploadFolder.TEMP
    })
    @IsOptional()
    @IsEnum(UploadFolder)
    folder?: UploadFolder;
}

/** Tải ảnh từ URL công khai (http/https), lưu vào temp hoặc products */
export class ImageFromUrlDto {
    @ApiProperty({
        description: 'URL ảnh công khai (http/https)',
        example: 'https://example.com/dish.jpg',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(2048)
    url: string;

    @ApiPropertyOptional({
        description: 'Thư mục lưu (mặc định products — khỏi cần move từ temp khi tạo món)',
        enum: UploadFolder,
        default: UploadFolder.PRODUCTS,
    })
    @IsOptional()
    @IsEnum(UploadFolder)
    folder?: UploadFolder;
}

export class UploadImageFormDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File ảnh cần upload (bắt buộc)'
    })
    image: Express.Multer.File;

    @ApiProperty({
        type: 'string',
        description: 'Folder lưu ảnh (temp, products, categories, orders)',
        example: 'temp',
        default: 'temp',
        required: false
    })
    folder?: string;
}

export class MoveImageDto {
    @ApiProperty({
        description: 'Tên file cần di chuyển'
    })
    @IsString()
    filename: string;

    @ApiProperty({
        description: 'Folder nguồn',
        enum: UploadFolder,
        default: UploadFolder.TEMP
    })
    @IsOptional()
    @IsEnum(UploadFolder)
    fromFolder?: UploadFolder;

    @ApiProperty({
        description: 'Folder đích',
        enum: UploadFolder
    })
    @IsEnum(UploadFolder)
    toFolder: UploadFolder;
}

export class DeleteImageDto {
    @ApiProperty({
        description: 'Tên file cần xóa'
    })
    @IsString()
    filename: string;

    @ApiProperty({
        description: 'Folder chứa file',
        enum: UploadFolder,
        default: UploadFolder.TEMP
    })
    @IsOptional()
    @IsEnum(UploadFolder)
    folder?: UploadFolder;
}

export class UploadResultDto {
    @ApiProperty({
        description: 'Tên file đã upload'
    })
    filename: string;

    @ApiProperty({
        description: 'Tên file gốc'
    })
    originalName: string;

    @ApiProperty({
        description: 'Kích thước file (bytes)'
    })
    size: number;

    @ApiProperty({
        description: 'Loại MIME của file'
    })
    mimetype: string;

    @ApiProperty({
        description: 'URL để truy cập ảnh'
    })
    url: string;

    @ApiProperty({
        description: 'Đường dẫn file trên server'
    })
    path: string;
}

export class UploadResponseDto {
    @ApiProperty({
        description: 'Trạng thái thành công'
    })
    success: boolean;

    @ApiProperty({
        description: 'Thông báo'
    })
    message: string;

    @ApiProperty({
        description: 'Dữ liệu kết quả',
        type: UploadResultDto
    })
    data: UploadResultDto;
} 