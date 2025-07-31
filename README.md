<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Sky Order Backend

A NestJS backend for a food ordering system with full CRUD operations for categories and menu items, including soft delete functionality.

## Features

- **Categories Management**: Full CRUD operations for food categories
- **Menu Items Management**: Complete menu item management with category relationships
- **Soft Delete**: Safe deletion with restore functionality
- **Search & Filter**: Advanced search and filtering capabilities
- **Sales Tracking**: Track menu item sales and popularity
- **Multi-language Support**: Vietnamese and Korean language support
- **Image Management**: Local image path support for menu items
- **API Documentation**: Interactive Swagger/OpenAPI documentation

## Database Schema

### Categories Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR) - Category name in Vietnamese
- `nameKo` (VARCHAR) - Category name in Korean
- `icon` (VARCHAR) - Emoji icon
- `description` (TEXT) - Description in Vietnamese
- `descriptionKo` (TEXT) - Description in Korean
- `isActive` (BOOLEAN) - Active status
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)
- `deletedAt` (TIMESTAMP) - Soft delete timestamp

### Menu Items Table
- `id` (UUID, Primary Key)
- `name` (VARCHAR) - Item name in Vietnamese
- `nameKo` (VARCHAR) - Item name in Korean
- `addName` (VARCHAR) - Additional name
- `addNameKo` (VARCHAR) - Additional name in Korean
- `price` (DECIMAL) - Item price
- `description` (TEXT) - Description in Vietnamese
- `descriptionKo` (TEXT) - Description in Korean
- `image` (VARCHAR) - Image path
- `categoryId` (UUID, Foreign Key) - Category reference
- `category` (VARCHAR) - Category name (denormalized)
- `categoryKo` (VARCHAR) - Category name in Korean (denormalized)
- `available` (BOOLEAN) - Availability status
- `sales` (INTEGER) - Sales count
- `statusKey` (VARCHAR) - Status identifier
- `count` (INTEGER) - Count field
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)
- `deletedAt` (TIMESTAMP) - Soft delete timestamp

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Database Setup

#### MySQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# macOS
brew install mysql

# Windows
# Download from https://dev.mysql.com/downloads/mysql/
```

#### Create Database
```bash
# Connect to MySQL
sudo mysql -u root -p

# Create database
CREATE DATABASE sky_order CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional)
CREATE USER 'sky_order_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON sky_order.* TO 'sky_order_user'@'localhost';
FLUSH PRIVILEGES;

# Exit
EXIT;
```

#### Run Database Schema
```bash
# Connect to your database
mysql -u root -p sky_order

# Run the schema file
source database-schema-mysql.sql;
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Application Configuration
PORT=4500
NODE_ENV=development

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=sky_order

# CORS Configuration
# REQUIRED: Comma-separated list of allowed origins (no spaces around commas)
# Examples:
# - Single origin: CORS_ORIGIN=http://localhost:8000
# - Multiple origins: CORS_ORIGIN=http://localhost:8000,http://localhost:3000
# - Wildcard subdomain: CORS_ORIGIN=http://*.yourdomain.com
# - All localhost ports: CORS_ORIGIN=http://localhost:*
# - Production: CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_ORIGIN=http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000,http://172.16.4.9:8000,http://172.16.4.9:*,http://localhost:*,http://127.0.0.1:*

# Comma-separated list of allowed HTTP methods
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS

# Comma-separated list of allowed headers
CORS_ALLOWED_HEADERS=Content-Type,Authorization,Accept

# Enable credentials (cookies, authorization headers)
CORS_CREDENTIALS=true

# Swagger Configuration
SWAGGER_TITLE=Sky Order API
SWAGGER_DESCRIPTION=Food ordering system API with categories and menu items management
SWAGGER_VERSION=1.0
SWAGGER_PATH=api/docs

# Logging Configuration
LOG_LEVEL=debug
LOG_FORMAT=combined

# Security Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=24h

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

**Note**: Copy `env.example` to `.env` and update the values according to your setup.

### 4. Run the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### 5. Access API Documentation

Once the application is running, you can access the interactive API documentation:

- **Swagger UI**: http://localhost:4500/api/docs
- **OpenAPI JSON**: http://localhost:4500/api/docs-json

The Swagger documentation provides:
- Interactive API testing
- Request/response examples
- Schema definitions
- Authentication information
- Error code documentation

## API Endpoints

### Categories

#### Get All Categories
```http
GET /api/categories
```

#### Get All Categories (including deleted)
```http
GET /api/categories?includeDeleted=true
```

#### Get Categories with Menu Count
```http
GET /api/categories/with-count
```

#### Get Category by ID
```http
GET /api/categories/:id
```

#### Create Category
```http
POST /api/categories
Content-Type: application/json

{
  "name": "Cơm Xôi",
  "nameKo": "찹쌀",
  "icon": "🍚",
  "description": "Cơm và xôi theo phong cách Việt",
  "descriptionKo": "베트남식 밥과 찹쌀",
  "isActive": true
}
```

#### Update Category
```http
PATCH /api/categories/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": false
}
```

#### Soft Delete Category
```http
DELETE /api/categories/:id
```

#### Restore Category
```http
POST /api/categories/:id/restore
```

#### Hard Delete Category
```http
DELETE /api/categories/:id/permanent
```

### Menu Items

#### Get All Menu Items
```http
GET /api/menu
```

#### Get All Menu Items (including deleted)
```http
GET /api/menu?includeDeleted=true
```

#### Get Menu Items by Category
```http
GET /api/menu/category/:categoryId
```

#### Search Menu Items
```http
GET /api/menu/search?q=search_term
```

#### Get Popular Menu Items
```http
GET /api/menu/popular?limit=10
```

#### Get Menu Item by ID
```http
GET /api/menu/:id
```

#### Create Menu Item
```http
POST /api/menu
Content-Type: application/json

{
  "name": "Cơm Rang Dưa Bò",
  "nameKo": "김치 볶음 밥",
  "addName": "Cơm Rang Dưa Bò",
  "addNameKo": "김치 볶음 밥",
  "price": 10000,
  "description": "Cơm rang với dưa bò thơm ngon",
  "descriptionKo": "베트남 김치, 소고기를 넣어서 만든 볶음밥",
  "image": "/images/com-rang-dua-bo.jpg",
  "categoryId": "11111111-1111-1111-1111-111111111111",
  "category": "Cơm Xôi",
  "categoryKo": "찹쌀",
  "available": true,
  "sales": 0,
  "statusKey": "menu-item-status",
  "count": 0
}
```

#### Update Menu Item
```http
PATCH /api/menu/:id
Content-Type: application/json

{
  "price": 12000,
  "available": false
}
```

#### Soft Delete Menu Item
```http
DELETE /api/menu/:id
```

#### Restore Menu Item
```http
POST /api/menu/:id/restore
```

#### Hard Delete Menu Item
```http
DELETE /api/menu/:id/permanent
```

#### Update Sales Count
```http
PATCH /api/menu/:id/sales
Content-Type: application/json

{
  "sales": 25
}
```

#### Increment Sales Count
```http
POST /api/menu/:id/sales/increment
Content-Type: application/json

{
  "increment": 1
}
```

## Image Management

### Storage Location
Images are stored in the `public/images/` directory and served as static files by the backend.

### Directory Structure
```
sky-order-be/
├── public/
│   └── images/
│       ├── com-rang-dua-bo.jpg
│       ├── com-ga.jpg
│       ├── pho-bo.jpg
│       └── ... (other menu images)
```

### Image URLs
- **Base URL**: `http://localhost:4500/images/`
- **Example**: `http://localhost:4500/images/muc-kho-nuong.jpg`

### Adding Images
1. Place image files in `public/images/` directory
2. Use descriptive, kebab-case naming (e.g., `muc-kho-nuong.jpg`)
3. Update menu item's `image` field in database
4. Images are automatically served at `/images/filename`

### Recommended Image Specifications
- **Size**: 800x600 pixels (4:3 ratio)
- **Format**: JPEG for photos, PNG for graphics
- **File Size**: Under 500KB per image
- **Naming**: Use kebab-case (e.g., `com-rang-dua-bo.jpg`)

### Required Images
Create the following images in your `/images/` directory:

#### Cơm Xôi (7 items)
- `com-rang-dua-bo.jpg`
- `com-ga.jpg`
- `com-suon.jpg`
- `com-rang-hai-san.jpg`
- `tom-rim.jpg`
- `xoi-thap-cam.jpg`
- `met-ga.jpg`

#### Phở (7 items)
- `bun-bo-hue.jpg`
- `pho-bo.jpg`
- `cha-ram-tom.jpg`
- `goi-cuon.jpg`
- `tom-vien-chien.jpg`
- `tom-chien-xu.jpg`
- `cha-gio.jpg`

#### Bún (5 items)
- `banh-xeo.jpg`
- `nem-lui.jpg`
- `bun-thit-nuong.jpg`
- `bun-dau-mam-tom.jpg`
- `nem-nuong-nha-trang.jpg`

#### Nhậu (7 items)
- `muc-chien-xu.jpg`
- `tom-sot-bo-toi.jpg`
- `doi-sun-chien.jpg`
- `ngao-hap-thai.jpg`
- `ga-rang-muoi.jpg`
- `long-xao-dua.jpg`
- `trang-luoc.jpg`

#### Ăn Chơi (8 items)
- `muc-kho-nuong.jpg`
- `khoai-tay-chien.jpg`
- `ngo-chien.jpg`
- `dau-luot-van.jpg`
- `xoai-dam.jpg`
- `banh-da.jpg`
- `bo-kho.jpg`
- `lac-rang.jpg`

#### Bánh Mỳ - Nộm (8 items)
- `banh-mi-thit.jpg`
- `ba-te.jpg`
- `bo-ne.jpg`
- `rau-muong-xao.jpg`
- `goi-hai-san.jpg`
- `nom-ga.jpg`
- `chan-ga-sot-thai.jpg`
- `banh-phong-tom.jpg`

#### Lẩu (3 items)
- `lau-thai.jpg`
- `lau-long.jpg`
- `lau-ga.jpg`

#### Đồ Uống (15 items)
- `ruou-mai-que-lo.jpg`
- `ruou-chamisul.jpg`
- `ruou-chum-churum.jpg`
- `ruou-jinro.jpg`
- `bia-cass.jpg`
- `bia-tuoi-500ml.jpg`
- `bia-tuoi-1500ml.jpg`
- `bia-sai-gon.jpg`
- `bia-ha-noi.jpg`
- `coca.jpg`
- `soda.jpg`
- `tra-xanh.jpg`
- `nuoc-dua-lon.jpg`
- `dua-tuoi.jpg`
- `nuoc-yen.jpg`
- `sting.jpg`

#### Set Menu (4 items)
- `set-a.jpg`
- `set-b.jpg`
- `set-c.jpg`
- `set-d.jpg`

## Development

### Project Structure
```
src/
├── controllers/          # API controllers
│   ├── category.controller.ts
│   └── menu-item.controller.ts
├── dto/                  # Data Transfer Objects
│   ├── category.dto.ts
│   └── menu-item.dto.ts
├── entities/             # TypeORM entities
│   ├── category.entity.ts
│   └── menu-item.entity.ts
├── services/             # Business logic
│   ├── category.service.ts
│   └── menu-item.service.ts
├── swagger.config.ts     # Swagger documentation configuration
├── app.controller.ts     # Main controller
├── app.module.ts         # Main module
├── app.service.ts        # Main service
└── main.ts              # Application entry point
```

### Available Scripts
- `npm run build` - Build the application
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start in production mode
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:e2e` - Run end-to-end tests

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Validation

All input data is validated using class-validator decorators:

- Required fields validation
- String length limits
- Number range validation
- UUID format validation
- Boolean validation

## Soft Delete Features

### Benefits
- Data recovery capability
- Maintains referential integrity
- Audit trail preservation
- Safe deletion for production

### Operations
- **Soft Delete**: Sets `deletedAt` timestamp and marks as inactive
- **Restore**: Removes `deletedAt` timestamp and reactivates
- **Hard Delete**: Permanently removes from database
- **Query Filtering**: Automatically excludes soft-deleted records

## API Documentation

### Swagger Features

The API documentation is built with Swagger/OpenAPI and includes:

- **Interactive Testing**: Try out API endpoints directly from the browser
- **Request Examples**: Pre-filled request bodies with sample data
- **Response Schemas**: Detailed response structure documentation
- **Error Codes**: Complete list of possible error responses
- **Authentication**: JWT bearer token support (ready for future implementation)
- **Search & Filter**: Easy navigation through API endpoints

### Documentation Structure

- **Categories API**: All category management endpoints
- **Menu API**: All menu item management endpoints
- **Schemas**: Complete data models with validation rules
- **Examples**: Real-world usage examples

### Using the Documentation

1. **Browse Endpoints**: Navigate through different API sections
2. **Test Requests**: Click "Try it out" to test endpoints
3. **View Responses**: See expected response formats
4. **Download Spec**: Export OpenAPI specification for client generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
