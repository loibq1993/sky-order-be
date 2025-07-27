import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('images')
@Controller('images')
export class ImagesController {
    @Get(':filename')
    @ApiOperation({ summary: 'Serve ảnh từ thư mục images cũ' })
    @ApiParam({ name: 'filename', description: 'Tên file ảnh' })
    serveImage(@Param('filename') filename: string, @Res() res: Response) {
        const imagePath = path.join(process.cwd(), 'public', 'images', filename);
        console.log('Old images path:', imagePath);

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