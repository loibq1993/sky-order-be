import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
    imports: [
        MulterModule.register({
            dest: './public/upload/temp',
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
                files: 1,
                fieldSize: 10 * 1024 * 1024 // 10MB for form fields
            },
            fileFilter: (req, file, cb) => {
                // Allow only images
                if (file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
                    cb(null, true);
                } else {
                    cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)'), false);
                }
            }
        }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule { } 