import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
    filename: string;
    originalName: string;
    size: number;
    mimetype: string;
    url: string;
    path: string;
}

@Injectable()
export class UploadService {
    private readonly allowedFolders = ['temp', 'products', 'categories', 'orders'];
    private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

    constructor() {
        // Tự động tạo các folder cần thiết khi khởi tạo service
        this.ensureAllFoldersExist();
    }

    // Tạo tên file unique theo timestamp + tên gốc
    generateUniqueFilename(originalName: string): string {
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);
        const timestamp = Date.now();
        // Loại bỏ ký tự đặc biệt và thay thế bằng dấu gạch ngang
        const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        return `${timestamp}-${cleanName}${ext}`;
    }

    // Validate file
    validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('Không có file được upload');
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)');
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException('Kích thước file không được vượt quá 5MB');
        }
    }

    // Validate folder
    validateFolder(folder: string): void {
        if (!this.allowedFolders.includes(folder)) {
            throw new BadRequestException('Folder không hợp lệ');
        }
    }

    // Tạo đường dẫn upload
    getUploadPath(folder: string): string {
        // Sử dụng đường dẫn tuyệt đối từ project root
        return path.join(process.cwd(), 'public', 'upload', folder);
    }

    // Tạo folder nếu chưa tồn tại
    ensureFolderExists(folderPath: string): void {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    }

    // Tạo tất cả folder cần thiết
    ensureAllFoldersExist(): void {
        this.allowedFolders.forEach(folder => {
            const folderPath = this.getUploadPath(folder);
            this.ensureFolderExists(folderPath);
        });
    }

    // Xử lý upload file
    async uploadFile(file: Express.Multer.File, folder: string = 'temp'): Promise<UploadResult> {
        this.validateFile(file);
        this.validateFolder(folder);

        // Đảm bảo tất cả folder tồn tại
        this.ensureAllFoldersExist();

        const uploadPath = this.getUploadPath(folder);
        const filename = this.generateUniqueFilename(file.originalname);
        const filePath = path.join(uploadPath, filename);

        // Di chuyển file từ temp sang folder đích
        fs.renameSync(file.path, filePath);

        const imageUrl = `/upload/${folder}/${filename}`;

        return {
            filename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            url: imageUrl,
            path: `/upload/${folder}/${filename}`
        };
    }



    // Di chuyển file từ folder này sang folder khác (internal method)
    async moveFile(filename: string, fromFolder: string, toFolder: string): Promise<UploadResult> {
        this.validateFolder(fromFolder);
        this.validateFolder(toFolder);

        const sourcePath = path.join(this.getUploadPath(fromFolder), filename);
        const destPath = path.join(this.getUploadPath(toFolder), filename);

        if (!fs.existsSync(sourcePath)) {
            throw new BadRequestException('File không tồn tại');
        }

        const destDir = path.dirname(destPath);
        this.ensureFolderExists(destDir);

        fs.renameSync(sourcePath, destPath);

        const imageUrl = `/upload/${toFolder}/${filename}`;

        return {
            filename,
            originalName: filename,
            size: fs.statSync(destPath).size,
            mimetype: 'image/jpeg', // Default mime type
            url: imageUrl,
            path: `/upload/${toFolder}/${filename}`
        };
    }

    // Move file từ temp sang folder chính thức (public method)
    async moveFromTemp(filename: string, toFolder: string): Promise<UploadResult> {
        return this.moveFile(filename, 'temp', toFolder);
    }

    // Xóa file
    async deleteFile(filename: string, folder: string): Promise<void> {
        this.validateFolder(folder);

        const filePath = path.join(this.getUploadPath(folder), filename);

        if (!fs.existsSync(filePath)) {
            throw new BadRequestException('File không tồn tại');
        }

        fs.unlinkSync(filePath);
    }

    // Lấy danh sách file trong folder
    async listFiles(folder: string): Promise<string[]> {
        this.validateFolder(folder);

        const folderPath = this.getUploadPath(folder);

        if (!fs.existsSync(folderPath)) {
            return [];
        }

        return fs.readdirSync(folderPath);
    }

    // Dọn dẹp file tạm (xóa file cũ hơn 24h)
    async cleanupTempFiles(): Promise<number> {
        const tempPath = this.getUploadPath('temp');

        if (!fs.existsSync(tempPath)) {
            return 0;
        }

        const files = fs.readdirSync(tempPath);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        let deletedCount = 0;

        for (const file of files) {
            const filePath = path.join(tempPath, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtime.getTime() > oneDay) {
                fs.unlinkSync(filePath);
                deletedCount++;
            }
        }

        return deletedCount;
    }
} 