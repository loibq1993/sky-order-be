import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

export interface CorsConfig {
    origin: string[];
    originFromDb: boolean;
    originCacheTtlMs: number;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
}

export interface SwaggerConfig {
    title: string;
    description: string;
    version: string;
    path: string;
}

export interface AppConfig {
    port: number;
    nodeEnv: string;
    logLevel: string;
    logFormat: string;
    apiBaseUrl: string;
    /** Hostnames where super_admin login is allowed (platform root). Comma-separated in env. */
    rootDomains: string[];
}

export interface SecurityConfig {
    jwtSecret: string;
    jwtExpiresIn: string;
}

export interface FileUploadConfig {
    maxFileSize: number;
    uploadPath: string;
}

export interface StripeConfig {
    secretKey: string;
    webhookSecret: string;
    currency: string;
    frontendUrl: string;
}

export default registerAs('app', () => ({
    // Application Configuration
    port: parseInt(process.env.PORT || '4500', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'debug',
    logFormat: process.env.LOG_FORMAT || 'combined',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4500',

    // Root domain(s) for platform admin (super_admin login allowed only from these hosts)
    rootDomains: process.env.APP_ROOT_DOMAIN
        ? process.env.APP_ROOT_DOMAIN
            .split(',')
            .map((h: string) => h.trim().replace(/^https?:\/\//, '').split(':')[0])
            .filter(Boolean)
        : ['localhost', '127.0.0.1'],

    // Database Configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'your_password',
        database: process.env.DB_DATABASE || 'sky_order',
    },

    // CORS Configuration
    cors: {
        /** true = chỉ cho phép Origin trong CORS_ORIGIN + customDomain tenant trong DB (public.tenants). false = reflect mọi Origin (dev). */
        originFromDb: process.env.CORS_ORIGIN_FROM_DB === 'true',
        /** Làm mới cache domain tenant (ms); mặc định 60s. */
        originCacheTtlMs: parseInt(process.env.CORS_ORIGIN_CACHE_TTL_MS || '60000', 10),
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : [],
        methods: process.env.CORS_METHODS
            ? process.env.CORS_METHODS.split(',').map(method => method.trim())
            : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS
            ? process.env.CORS_ALLOWED_HEADERS.split(',').map(header => header.trim())
            : ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-Domain', 'x-tenant-domain', 'X-Client-Host', 'x-client-host'],
        credentials: process.env.CORS_CREDENTIALS !== 'false',
    },

    // Swagger Configuration
    swagger: {
        title: process.env.SWAGGER_TITLE || 'Sky Order API',
        description: process.env.SWAGGER_DESCRIPTION || 'Food ordering system API with categories and menu items management',
        version: process.env.SWAGGER_VERSION || '1.0',
        path: process.env.SWAGGER_PATH || 'api/docs',
    },

    // Security Configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // File Upload Configuration
    fileUpload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
        uploadPath: process.env.UPLOAD_PATH || './uploads',
    },

    // Stripe Payment
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        currency: (process.env.STRIPE_CURRENCY || 'vnd').toLowerCase(),
        frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
    },
})); 