import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class QrCodeService {
    private readonly qrCodeDir = path.join(process.cwd(), 'public', 'upload', 'qr-codes');

    constructor() {
        this.ensureQrCodeDirectory();
    }

    private ensureQrCodeDirectory(): void {
        if (!fs.existsSync(this.qrCodeDir)) {
            fs.mkdirSync(this.qrCodeDir, { recursive: true });
        }
    }

    async generateQrCode(data: string, filename: string): Promise<string> {
        const filePath = path.join(this.qrCodeDir, filename);

        try {
            await QRCode.toFile(filePath, data, {
                errorCorrectionLevel: 'M',
                type: 'png',
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 300
            });

            return `/upload/qr-codes/${filename}`;
        } catch (error) {
            throw new Error(`Failed to generate QR code: ${error.message}`);
        }
    }

    async generateQrCodeForTable(tableNumber: number, baseUrl: string, restaurantName: string): Promise<{
        qrCodeUrl: string;
        qrCodeImagePath: string;
        orderUrl: string;
        qrUuid: string;
    }> {
        // Generate UUID for QR code
        const qrUuid = require('uuid').v4();

        // Tạo URL order cho bàn (điều hướng đến frontend) - sử dụng tableNumber
        const orderUrl = `${baseUrl}?table=${tableNumber}`;

        // Tạo filename cho QR code using UUID
        const filename = `qr-${qrUuid}.png`;

        // Tạo QR code với URL trực tiếp (không phải JSON object)
        const qrData = orderUrl;

        // Generate QR code image
        const qrCodeImagePath = await this.generateQrCode(qrData, filename);

        // URL để truy cập QR code (public API endpoint) - use tableId instead of qrUuid
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:4500';
        const qrCodeUrl = `${backendUrl}/api/tables/qr/${tableNumber}`;

        return {
            qrCodeUrl,
            qrCodeImagePath,
            orderUrl,
            qrUuid
        };
    }

    async generateMultipleQrCodes(
        count: number,
        baseUrl: string,
        restaurantName: string
    ): Promise<Array<{
        tableNumber: number;
        qrCodeUrl: string;
        qrCodeImagePath: string;
        orderUrl: string;
        qrUuid: string;
    }>> {
        const results: Array<{
            tableNumber: number;
            qrCodeUrl: string;
            qrCodeImagePath: string;
            orderUrl: string;
            qrUuid: string;
        }> = [];

        for (let i = 1; i <= count; i++) {
            const tableNumber = i;
            const result = await this.generateQrCodeForTable(tableNumber, baseUrl, restaurantName);
            results.push({
                tableNumber,
                ...result
            });
        }

        return results;
    }

    async deleteQrCode(tableNumber: number): Promise<void> {
        const filename = `table-${tableNumber}.png`;
        const filePath = path.join(this.qrCodeDir, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
} 