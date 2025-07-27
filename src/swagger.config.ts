import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
    const config = new DocumentBuilder()
        .setTitle('Sky Order API')
        .setDescription(`
      # Sky Order Food System API

      A comprehensive API for managing a food ordering system with categories and menu items.

      ## Features
      - **Categories Management**: Full CRUD operations for food categories
      - **Menu Items Management**: Complete menu item management with category relationships
      - **Soft Delete**: Safe deletion with restore functionality
      - **Search & Filter**: Advanced search and filtering capabilities
      - **Sales Tracking**: Track menu item sales and popularity
      - **Multi-language Support**: Vietnamese and Korean language support
      - **Image Management**: Local image path support for menu items

      ## Authentication
      Currently, this API does not require authentication for development purposes.

      ## Rate Limiting
      No rate limiting is currently implemented.

      ## Error Codes
      - \`200\` - Success
      - \`201\` - Created
      - \`400\` - Bad Request (validation errors)
      - \`404\` - Not Found
      - \`500\` - Internal Server Error

      ## Data Formats
      - All timestamps are in ISO 8601 format
      - Prices are in VND (Vietnamese Dong)
      - UUIDs are used for all IDs
      - Images are stored as local paths (e.g., \`/images/filename.jpg\`)
    `)
        .setVersion('1.0')
        .addTag('categories', 'Food categories management - Create, read, update, delete, and restore categories')
        .addTag('menu', 'Menu items management - Create, read, update, delete, restore, search, and track sales')
        .addServer('http://localhost:4500', 'Development server')
        .addServer('https://your-production-domain.com', 'Production server')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            filter: true,
            showRequestDuration: true,
            tryItOutEnabled: true,
            requestInterceptor: (req: any) => {
                req.headers['Content-Type'] = 'application/json';
                return req;
            },
        },
        customSiteTitle: 'Sky Order API Documentation',
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .info .description { color: #34495e; }
      .swagger-ui .scheme-container { background: #ecf0f1; }
    `,
    });

    return document;
} 