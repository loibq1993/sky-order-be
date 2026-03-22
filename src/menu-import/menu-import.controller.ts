import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as fs from 'fs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RestaurantId } from '../auth/decorators/restaurant.decorator';
import { MenuImportService, MenuImportResultDto } from './menu-import.service';

const UPLOAD_LIMIT = 5 * 1024 * 1024;

@ApiTags('menu-import')
@Controller('admin/menu-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'restaurant_owner', 'restaurant_manager')
@ApiBearerAuth()
export class MenuImportController {
  constructor(private readonly menuImportService: MenuImportService) {}

  @Get('template')
  @ApiOperation({ summary: 'Tải file Excel mẫu import menu' })
  @ApiResponse({ status: 200, description: 'File .xlsx' })
  async downloadTemplate(): Promise<StreamableFile> {
    const buf = await this.menuImportService.buildTemplateBuffer();
    return new StreamableFile(buf, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="menu-import-template.xlsx"',
    });
  }

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Import danh mục + món từ Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File .xlsx' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Kết quả import' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_LIMIT },
    }),
  )
  async importExcel(
    @UploadedFile() file: Express.Multer.File,
    @RestaurantId() restaurantId: string,
  ): Promise<MenuImportResultDto> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file .xlsx');
    }
    const name = file.originalname?.toLowerCase() ?? '';
    if (!name.endsWith('.xlsx')) {
      throw new BadRequestException('Chỉ hỗ trợ định dạng .xlsx');
    }

    let buffer: Buffer;
    if (file.buffer?.length) {
      buffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      try {
        buffer = fs.readFileSync(file.path);
      } finally {
        fs.unlinkSync(file.path);
      }
    } else {
      throw new BadRequestException(
        'Không nhận được nội dung file. Thử lại hoặc lưu file dạng .xlsx (Excel / Google Sheets → Tải xuống Microsoft Excel).',
      );
    }

    if (!buffer?.length) {
      throw new BadRequestException('File rỗng hoặc không đọc được.');
    }

    return this.menuImportService.importFromExcel(buffer, restaurantId);
  }
}
