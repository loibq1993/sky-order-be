import {
    Controller,
    Post,
    Get,
    Delete,
    UseInterceptors,
    UploadedFile,
    Body,
    Query,
    Param,
    Res,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiConsumes,
    ApiBody,
    ApiQuery,
    ApiParam,
    ApiExtraModels
} from '@nestjs/swagger';
import { UploadService, UploadResult } from './upload.service';
import { UploadImageDto, UploadImageFormDto } from './upload.dto';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('upload')
@ApiExtraModels(UploadImageFormDto)
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('image')
    @UseInterceptors(FileInterceptor('image'))
    @ApiOperation({
        summary: 'Upload ảnh',
        description: 'Upload ảnh với folder tùy chọn. File ảnh là bắt buộc, folder mặc định là "temp".'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Form data với file ảnh và folder tùy chọn',
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary',
                    description: 'File ảnh cần upload (bắt buộc)'
                },
                folder: {
                    type: 'string',
                    description: 'Folder lưu ảnh (temp, products, categories, orders)',
                    example: 'temp',
                    default: 'temp'
                }
            },
            required: ['image']
        }
    })

    @ApiResponse({
        status: 201,
        description: 'Upload ảnh thành công',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        filename: { type: 'string' },
                        originalName: { type: 'string' },
                        size: { type: 'number' },
                        mimetype: { type: 'string' },
                        url: { type: 'string' },
                        path: { type: 'string' }
                    }
                }
            }
        }
    })
    async uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadData: UploadImageDto
    ): Promise<{ success: boolean; message: string; data: UploadResult }> {
        const folder = uploadData.folder || 'temp';
        const result = await this.uploadService.uploadFile(file, folder);

        return {
            success: true,
            message: 'Upload ảnh thành công',
            data: result
        };
    }

    @Delete('delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa ảnh' })
    @ApiQuery({ name: 'filename', description: 'Tên file cần xóa' })
    @ApiQuery({ name: 'folder', description: 'Folder chứa file', example: 'temp' })
    @ApiResponse({
        status: 200,
        description: 'Xóa ảnh thành công'
    })
    async deleteImage(
        @Query('filename') filename: string,
        @Query('folder') folder: string = 'temp'
    ): Promise<{ success: boolean; message: string; data: { filename: string; folder: string } }> {
        await this.uploadService.deleteFile(filename, folder);

        return {
            success: true,
            message: 'Xóa ảnh thành công',
            data: { filename, folder }
        };
    }

    @Get('list/:folder')
    @ApiOperation({ summary: 'Lấy danh sách file trong folder' })
    @ApiParam({ name: 'folder', description: 'Folder cần liệt kê' })
    @ApiResponse({
        status: 200,
        description: 'Danh sách file'
    })
    async listFiles(@Param('folder') folder: string): Promise<{ success: boolean; data: string[] }> {
        const files = await this.uploadService.listFiles(folder);

        return {
            success: true,
            data: files
        };
    }

    @Post('cleanup')
    @ApiOperation({ summary: 'Dọn dẹp file tạm (xóa file cũ hơn 24h)' })
    @ApiResponse({
        status: 200,
        description: 'Dọn dẹp thành công'
    })
    async cleanupTempFiles(): Promise<{ success: boolean; message: string; deletedCount: number }> {
        const deletedCount = await this.uploadService.cleanupTempFiles();

        return {
            success: true,
            message: `Đã xóa ${deletedCount} file tạm`,
            deletedCount
        };
    }

    // Serve ảnh từ thư mục images cũ (để tương thích với URL cũ) - PHẢI ĐỂ TRƯỚC
    @Get('images/:filename')
    @ApiOperation({ summary: 'Serve ảnh từ thư mục images cũ' })
    @ApiParam({ name: 'filename', description: 'Tên file ảnh' })
    serveImagesFolder(@Param('filename') filename: string, @Res() res: Response) {
        const imagePath = path.join(process.cwd(), 'public', 'images', filename);
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                message: 'Image not found',
                error: 'Not Found',
                statusCode: 404
            });
        }

        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    }

    @Get(':folder/:filename')
    @ApiOperation({ summary: 'Serve ảnh từ folder' })
    @ApiParam({ name: 'folder', description: 'Folder chứa ảnh' })
    @ApiParam({ name: 'filename', description: 'Tên file ảnh' })
    serveImage(
        @Param('folder') folder: string,
        @Param('filename') filename: string,
        @Res() res: Response
    ) {
        const allowedFolders = ['temp', 'products', 'categories', 'orders'];
        if (!allowedFolders.includes(folder)) {
            return res.status(400).json({
                message: 'Folder không hợp lệ',
                error: 'Bad Request',
                statusCode: 400
            });
        }

        // Serve ảnh từ thư mục uploads
        const imagePath = path.join(process.cwd(), 'public', 'upload', folder, filename);
        console.log(imagePath);
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                message: 'Image not found',
                error: 'Not Found',
                statusCode: 404
            });
        }

        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    }

    // Backward compatibility - serve ảnh từ thư mục images cũ
    @Get('legacy/images/:filename')
    @ApiOperation({ summary: 'Serve ảnh từ thư mục images cũ (backward compatibility)' })
    @ApiParam({ name: 'filename', description: 'Tên file ảnh' })
    serveOldImage(@Param('filename') filename: string, @Res() res: Response) {
        const imagePath = path.join(process.cwd(), 'public', 'images', filename);
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                message: 'Image not found',
                error: 'Not Found',
                statusCode: 404
            });
        }

        const stream = fs.createReadStream(imagePath);
        stream.pipe(res);
    }
} 