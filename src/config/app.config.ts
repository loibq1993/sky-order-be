import { ConfigService } from '@nestjs/config';

export class AppConfig {
    constructor(private configService: ConfigService) { }

    get port(): number {
        return this.configService.get<number>('app.port', 4500);
    }

    get nodeEnv(): string {
        return this.configService.get<string>('app.nodeEnv', 'development');
    }

    get database() {
        return {
            host: this.configService.get<string>('app.database.host', 'localhost'),
            port: this.configService.get<number>('app.database.port', 5432),
            username: this.configService.get<string>('app.database.username', 'postgres'),
            password: this.configService.get<string>('app.database.password', 'your_password'),
            database: this.configService.get<string>('app.database.database', 'sky_order'),
        };
    }

    get cors() {
        return {
            origin: this.configService.get<string[]>('app.cors.origin', ['http://localhost:3000', 'http://localhost:3001']),
            methods: this.configService.get<string[]>('app.cors.methods', [
                'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'
            ]),
            allowedHeaders: this.configService.get<string[]>('app.cors.allowedHeaders', [
                'Content-Type', 'Authorization', 'Accept', 'X-Restaurant-ID', 'x-restaurant-id'
            ]),
            credentials: this.configService.get<boolean>('app.cors.credentials', true),
        };
    }

    get swagger() {
        return {
            title: this.configService.get<string>('app.swagger.title', 'Sky Order API'),
            description: this.configService.get<string>('app.swagger.description', 'Food ordering system API with categories and menu items management'),
            version: this.configService.get<string>('app.swagger.version', '1.0'),
            path: this.configService.get<string>('app.swagger.path', 'api/docs'),
        };
    }

    get security() {
        return {
            jwtSecret: this.configService.get<string>('app.security.jwtSecret', 'your_jwt_secret_key_here'),
            jwtExpiresIn: this.configService.get<string>('app.security.jwtExpiresIn', '24h'),
        };
    }

    get fileUpload() {
        return {
            maxFileSize: this.configService.get<number>('app.fileUpload.maxFileSize', 5242880), // 5MB
            uploadPath: this.configService.get<string>('app.fileUpload.uploadPath', './uploads'),
        };
    }

    get backendUrl(): string {
        return this.configService.get<string>('app.backendUrl', 'http://localhost:4500');
    }
} 