import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    private readonly allowedFolders = ['temp', 'products', 'categories', 'orders', 'restaurants'];
    private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
    private s3Client: S3Client | null = null;

    constructor() {
        // Tự động tạo các folder cần thiết khi khởi tạo service
        this.ensureAllFoldersExist();
    }

    private isS3Enabled(): boolean {
        return !!(
            process.env.AWS_ACCESS_KEY_ID &&
            process.env.AWS_SECRET_ACCESS_KEY &&
            process.env.AWS_REGION &&
            process.env.AWS_S3_BUCKET
        );
    }

    private getS3Client(): S3Client {
        if (!this.s3Client) {
            this.s3Client = new S3Client({
                region: process.env.AWS_REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
                },
            });
        }
        return this.s3Client;
    }

    private buildS3Url(key: string): string {
        const publicBase = process.env.AWS_S3_PUBLIC_URL;
        if (publicBase) {
            return `${publicBase.replace(/\/$/, '')}/${key}`;
        }
        const bucket = process.env.AWS_S3_BUCKET;
        const region = process.env.AWS_REGION;
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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

        const filename = this.generateUniqueFilename(file.originalname);

        if (this.isS3Enabled()) {
            const key = `${folder}/${filename}`;
            const client = this.getS3Client();
            const body = file.buffer ? file.buffer : fs.createReadStream(file.path);
            const acl = process.env.AWS_S3_ACL || 'public-read';

            await client.send(new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                Body: body,
                ContentType: file.mimetype,
                ACL: acl as any,
            }));

            if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            return {
                filename,
                originalName: file.originalname,
                size: file.size,
                mimetype: file.mimetype,
                url: this.buildS3Url(key),
                path: key,
            };
        }

        const uploadPath = this.getUploadPath(folder);
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

    /** Chuẩn hóa MIME + kiểm tra allowed */
    private normalizeImageContentType(raw: string): string {
        const rawCt = raw.split(';')[0].trim().toLowerCase();
        let contentType = rawCt;
        if (contentType === 'image/jpg') contentType = 'image/jpeg';
        if (!this.allowedMimeTypes.includes(contentType)) {
            throw new BadRequestException(
                `Định dạng ảnh không hỗ trợ: ${rawCt || 'unknown'} (chỉ jpg, png, gif, webp)`,
            );
        }
        return contentType;
    }

    /** Lưu buffer ảnh đã kiểm tra kích thước (local hoặc S3) */
    private async persistImageBuffer(
        buf: Buffer,
        contentType: string,
        folder: string,
    ): Promise<UploadResult> {
        if (buf.length === 0) {
            throw new BadRequestException('File ảnh rỗng');
        }
        if (buf.length > this.maxFileSize) {
            throw new BadRequestException('Ảnh vượt quá 5MB');
        }

        const extMap: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
        };
        const ext = extMap[contentType] || '.jpg';
        const filename = this.generateUniqueFilename(`import${ext}`);

        this.ensureAllFoldersExist();

        if (this.isS3Enabled()) {
            const key = `${folder}/${filename}`;
            const client = this.getS3Client();
            const acl = process.env.AWS_S3_ACL || 'public-read';
            await client.send(
                new PutObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Key: key,
                    Body: buf,
                    ContentType: contentType,
                    ACL: acl as any,
                }),
            );
            return {
                filename,
                originalName: filename,
                size: buf.length,
                mimetype: contentType,
                url: this.buildS3Url(key),
                path: key,
            };
        }

        const uploadPath = this.getUploadPath(folder);
        const filePath = path.join(uploadPath, filename);
        fs.writeFileSync(filePath, buf);
        const publicUrl = `/upload/${folder}/${filename}`;
        return {
            filename,
            originalName: filename,
            size: buf.length,
            mimetype: contentType,
            url: publicUrl,
            path: publicUrl,
        };
    }

    /** Bỏ BOM, trim — tránh data: không nhận ra do ký tự ẩn đầu chuỗi */
    private sanitizeImageUrlInput(raw: string): string {
        if (typeof raw !== 'string') return '';
        return raw.replace(/^\uFEFF/, '').trim();
    }

    /**
     * Parse data:image/...;base64,... → buffer (chỉ ảnh hỗ trợ).
     */
    private parseDataUrlImage(dataUrl: string): { contentType: string; buf: Buffer } {
        const trimmed = this.sanitizeImageUrlInput(dataUrl);
        if (!trimmed.toLowerCase().startsWith('data:')) {
            throw new BadRequestException('URL ảnh không hợp lệ');
        }
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx === -1) {
            throw new BadRequestException('Data URL không hợp lệ (thiếu dữ liệu sau dấu phẩy)');
        }
        const header = trimmed.slice(0, commaIdx);
        const payload = trimmed.slice(commaIdx + 1);
        if (!/;base64/i.test(header)) {
            throw new BadRequestException('Chỉ hỗ trợ ảnh data URL dạng ;base64,');
        }
        const mimeMatch = /^data:([^;]+)/i.exec(header);
        const rawMime = (mimeMatch?.[1] || 'image/jpeg').trim().toLowerCase();
        let contentType = this.normalizeImageContentType(rawMime);

        let buf: Buffer;
        try {
            buf = Buffer.from(payload.replace(/\s/g, ''), 'base64');
        } catch {
            throw new BadRequestException('Base64 không hợp lệ');
        }
        if (buf.length === 0) {
            throw new BadRequestException('Giải mã base64 ảnh rỗng');
        }
        return { contentType, buf };
    }

    /**
     * Tải ảnh từ URL công khai (http/https), hoặc data:image/...;base64,... (paste từ clipboard).
     * Kiểm tra MIME/size, lưu vào folder (local hoặc S3).
     */
    async saveImageFromUrl(imageUrl: string, folder: string = 'products'): Promise<UploadResult> {
        this.validateFolder(folder);
        const trimmed = this.sanitizeImageUrlInput(imageUrl);
        if (!trimmed) {
            throw new BadRequestException('URL ảnh không hợp lệ');
        }

        if (trimmed.toLowerCase().startsWith('data:')) {
            const { contentType, buf } = this.parseDataUrlImage(trimmed);
            return this.persistImageBuffer(buf, contentType, folder);
        }

        /** Node `new URL('example.com/path')` throw — cần http(s):// */
        let toFetch = trimmed;
        if (!/^https?:\/\//i.test(toFetch)) {
            toFetch = `https://${toFetch.replace(/^\/+/, '')}`;
        }

        let parsed: URL;
        try {
            parsed = new URL(toFetch);
        } catch {
            throw new BadRequestException(
                'URL ảnh không hợp lệ: dùng http(s):// hoặc data:image/...;base64,...',
            );
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new BadRequestException('Chỉ chấp nhận URL http(s) hoặc data:image/...;base64,...');
        }

        const fetchUrl = parsed.href;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        let response: Response;
        try {
            response = await fetch(fetchUrl, {
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'SkyOrder-MenuImport/1.0',
                    Accept: 'image/*,*/*;q=0.8',
                },
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            throw new BadRequestException(`Tải ảnh thất bại: HTTP ${response.status}`);
        }

        const rawCt = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const contentType = this.normalizeImageContentType(rawCt);

        const buf = Buffer.from(await response.arrayBuffer());
        return this.persistImageBuffer(buf, contentType, folder);
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