import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class QrCodeService {
    private readonly qrCodeDir = path.join(process.cwd(), 'public', 'upload', 'qr-codes');

    constructor(private readonly configService: ConfigService) {
        this.ensureQrCodeDirectory();
    }

    private ensureQrCodeDirectory(): void {
        if (!fs.existsSync(this.qrCodeDir)) {
            fs.mkdirSync(this.qrCodeDir, { recursive: true });
        }
    }

    /** Use http for localhost/127.0.0.1; otherwise use app.nodeEnv: production → https, else → http */
    private applyProtocolByEnv(url: string): string {
        try {
            const parsed = new URL(url);
            const host = parsed.hostname?.toLowerCase() ?? '';
            const isLocal = host === 'localhost' || host === '127.0.0.1';
            const nodeEnv = this.configService.get<string>('app.nodeEnv') ?? process.env.NODE_ENV ?? 'development';
            const useHttps = !isLocal && nodeEnv === 'production';
            parsed.protocol = useHttps ? 'https:' : 'http:';
            return parsed.toString();
        } catch {
            // ignore
        }
        return url;
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

    async generateQrCodeForTable(
        tableNumber: number,
        baseUrl: string,
        restaurantName: string,
        restaurantId?: string
    ): Promise<{
        qrCodeUrl: string;
        qrCodeImagePath: string;
        orderUrl: string;
        qrUuid: string;
    }> {
        // Generate UUID for QR code
        const qrUuid = require('uuid').v4();

        const nodeEnv = this.configService.get<string>('app.nodeEnv') ?? process.env.NODE_ENV ?? 'development';
        const baseUrlHost = (() => {
            try {
                const u = baseUrl.includes('://') ? baseUrl : `http://${baseUrl}`;
                return new URL(u).hostname?.toLowerCase() ?? '';
            } catch {
                return '';
            }
        })();
        const isLocalHost = baseUrlHost === 'localhost' || baseUrlHost === '127.0.0.1';
        const defaultProtocol = isLocalHost || nodeEnv !== 'production' ? 'http' : 'https';
        let secureBaseUrl = baseUrl.includes('://') ? baseUrl : `${defaultProtocol}://${baseUrl}`;
        secureBaseUrl = this.applyProtocolByEnv(secureBaseUrl);

        // Create order URL for the table (redirect to frontend) - using tableNumber
        const baseOrderUrl = new URL(secureBaseUrl);
        if (restaurantId) {
            const trimmedPath = baseOrderUrl.pathname.replace(/\/$/, '');
            baseOrderUrl.pathname = `${trimmedPath}/${restaurantId}`;
        }
        baseOrderUrl.search = '';
        baseOrderUrl.searchParams.set('table', tableNumber.toString());
        const orderUrl = baseOrderUrl.toString();

        // Create filename for QR code using UUID
        const filename = `qr-${qrUuid}.png`;

        // Create QR code with direct URL (not JSON object)
        const qrData = orderUrl;

        // Generate QR code image
        const qrCodeImagePath = await this.generateQrCode(qrData, filename);

        const backendUrl = baseUrl;
        const backendHost = (() => {
            try {
                const u = backendUrl.includes('://') ? backendUrl : `http://${backendUrl}`;
                return new URL(u).hostname?.toLowerCase() ?? '';
            } catch {
                return '';
            }
        })();
        const backendIsLocal = backendHost === 'localhost' || backendHost === '127.0.0.1';
        const backendProtocol = backendIsLocal || nodeEnv !== 'production' ? 'http' : 'https';
        let secureBackendUrl = backendUrl.includes('://')
            ? backendUrl
            : `${backendProtocol}://${backendUrl}`;
        secureBackendUrl = this.applyProtocolByEnv(secureBackendUrl);
        const baseNoTrailing = secureBackendUrl.replace(/\/+$/, '');
        const qrCodeUrl = restaurantId
            ? `${baseNoTrailing}/api/tables/qr/${tableNumber}?restaurantId=${restaurantId}`
            : `${baseNoTrailing}/api/tables/qr/${tableNumber}`;

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
        restaurantName: string,
        restaurantId?: string
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
            const result = await this.generateQrCodeForTable(tableNumber, baseUrl, restaurantName, restaurantId);
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