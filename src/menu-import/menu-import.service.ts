import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { IsNull } from 'typeorm';
import { TenantSchemaService } from '../tenant/tenant-schema.service';
import { TenantCategory } from '../entities/tenant/tenant-category.entity';
import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { UploadService } from '../upload/upload.service';

export interface MenuImportResultDto {
  categoriesCreated: number;
  categoriesReused: number;
  productsCreated: number;
  /** Số món đã gán ảnh từ URL (tải về và lưu storage) */
  imagesFromUrls: number;
  rowErrors: { row: number; message: string }[];
}

const MAX_ROWS = 2000;
const SHEET_NAME_HINT = 'Menu';

/** Loại BOM UTF-8 ở đầu file Excel */
function stripBom(raw: string): string {
  return raw.replace(/^\uFEFF/, '');
}

/** Chuẩn hóa tiêu đề cột để map với alias */
function normalizeHeader(raw: string): string {
  return stripBom(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Giá trị ô từ SheetJS → chuỗi (hỗ trợ số, ngày, hyperlink nếu có) */
function cellToImportString(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'number') {
    return String(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.hyperlink === 'string') return o.hyperlink.trim();
    if (typeof o.text === 'string') return o.text.trim();
  }
  return String(v).trim();
}

interface ParsedRow {
  categoryVi: string;
  categoryKo: string;
  productVi: string;
  productKo: string;
  price: number;
  descriptionVi: string;
  descriptionKo: string;
  /** URL ảnh món — tùy chọn */
  imageUrl: string;
}

/** Map header đã normalize → key nội bộ (tiếng Anh + tiếng Việt thường gặp) */
const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  category_vi: 'categoryVi',
  danh_muc_vi: 'categoryVi',
  ten_danh_muc: 'categoryVi',
  danh_muc: 'categoryVi',
  danh_muc_tieng_viet: 'categoryVi',
  loai: 'categoryVi',
  loai_mon: 'categoryVi',
  nhom: 'categoryVi',
  nhom_hang: 'categoryVi',
  phan_loai: 'categoryVi',
  category: 'categoryVi',
  category_ko: 'categoryKo',
  danh_muc_ko: 'categoryKo',
  ten_danh_muc_han: 'categoryKo',
  product_vi: 'productVi',
  ten_mon_vi: 'productVi',
  ten_mon: 'productVi',
  ten_mon_an: 'productVi',
  ten_mat_hang: 'productVi',
  ten_san_pham: 'productVi',
  ten_hang: 'productVi',
  mon_an: 'productVi',
  mon: 'productVi',
  mat_hang: 'productVi',
  san_pham: 'productVi',
  product_ko: 'productKo',
  ten_mon_ko: 'productKo',
  ten_mon_tieng_han: 'productKo',
  price: 'price',
  gia: 'price',
  don_gia: 'price',
  gia_ban: 'price',
  gia_tien: 'price',
  gia_mon: 'price',
  description_vi: 'descriptionVi',
  mo_ta_vi: 'descriptionVi',
  mo_ta: 'descriptionVi',
  ghi_chu: 'descriptionVi',
  description_ko: 'descriptionKo',
  mo_ta_ko: 'descriptionKo',
  image_url: 'imageUrl',
  url_anh: 'imageUrl',
  link_anh: 'imageUrl',
  hinh_anh: 'imageUrl',
  anh: 'imageUrl',
  image_link: 'imageUrl',
  link_hinh: 'imageUrl',
  duong_dan_anh: 'imageUrl',
  link_hinh_anh: 'imageUrl',
};

/** Thử map một dòng thành colMap; đủ 3 cột bắt buộc thì trả về map */
function tryBuildColMap(headerRow: unknown[]): Partial<Record<keyof ParsedRow, number>> | null {
  const colMap: Partial<Record<keyof ParsedRow, number>> = {};
  if (!headerRow?.length) return null;
  headerRow.forEach((cell, idx) => {
    let text = cellToImportString(cell).trim();
    text = stripBom(text);
    if (!text) return;
    const norm = normalizeHeader(text);
    const key = HEADER_ALIASES[norm];
    if (key) {
      colMap[key] = idx;
    }
  });
  if (
    colMap.categoryVi !== undefined &&
    colMap.productVi !== undefined &&
    colMap.price !== undefined
  ) {
    return colMap;
  }
  return null;
}

@Injectable()
export class MenuImportService {
  constructor(
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly uploadService: UploadService,
  ) {}

  async buildTemplateBuffer(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sky Order';
    const ws = wb.addWorksheet(SHEET_NAME_HINT, {
      properties: { defaultRowHeight: 20 },
    });

    /** Tiêu đề tiếng Việt — khớp HEADER_ALIASES; có thể đổi sang category_vi / product_vi / price nếu muốn */
    const header = ws.addRow([
      'Danh mục',
      'Danh mục (KO)',
      'Tên món',
      'Tên món (KO)',
      'Giá',
      'Mô tả',
      'Mô tả (KO)',
      'URL ảnh',
    ]);
    header.font = { bold: true };
    ws.columns = [
      { width: 22 },
      { width: 18 },
      { width: 28 },
      { width: 20 },
      { width: 12 },
      { width: 36 },
      { width: 30 },
      { width: 42 },
    ];

    ws.addRow([
      'Món Việt',
      '베트남 요리',
      'Phở bò',
      '쌀국수',
      55000,
      'Phở bò tái',
      '쌀국수',
      'https://example.com/pho.jpg',
    ]);

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async importFromExcel(buffer: Buffer, restaurantId: string): Promise<MenuImportResultDto> {
    if (!buffer?.length) {
      throw new BadRequestException('File rỗng');
    }

    // .xlsx là file ZIP (bắt đầu PK); tránh nhận nhầm HTML/CSV đổi đuôi
    if (!this.bufferLooksLikeXlsx(buffer)) {
      throw new BadRequestException(
        'File không phải Excel .xlsx hợp lệ (thiếu cấu trúc ZIP OOXML). Hãy mở bằng Excel/Google Sheets và chọn Lưu / Tải xuống dạng .xlsx.',
      );
    }

    /** Đọc bằng SheetJS (xlsx) — ổn định hơn exceljs.load với một số file Google Sheets / Excel. */
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellStyles: false,
      });
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Không đọc được file Excel (.xlsx): ${detail}`);
    }

    const sheetName =
      workbook.SheetNames.find((n) => n.trim().toLowerCase() === SHEET_NAME_HINT.toLowerCase()) ||
      workbook.SheetNames[0];
    if (!sheetName || !workbook.Sheets[sheetName]) {
      throw new BadRequestException('File không có sheet dữ liệu');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
      header: 1,
      defval: '',
      raw: true,
    }) as unknown[][];

    if (!rows?.length) {
      throw new BadRequestException('File không có dữ liệu');
    }

    /** Tìm dòng tiêu đề: quét ~15 dòng đầu (nhiều file có hàng tiêu đề / hàng trống phía trên) */
    const MAX_HEADER_SCAN = 15;
    let headerRowIndex = -1;
    let colMap: Partial<Record<keyof ParsedRow, number>> = {};
    for (let r = 0; r < Math.min(MAX_HEADER_SCAN, rows.length); r++) {
      const row = rows[r];
      const m = tryBuildColMap(row ?? []);
      if (m) {
        headerRowIndex = r;
        colMap = m;
        break;
      }
    }

    if (headerRowIndex < 0) {
      const previewLines: string[] = [];
      for (let r = 0; r < Math.min(5, rows.length); r++) {
        const line = (rows[r] ?? [])
          .map((c) => stripBom(cellToImportString(c).trim()))
          .filter(Boolean)
          .slice(0, 12)
          .join(' | ');
        if (line) previewLines.push(`Dòng ${r + 1}: "${line}"`);
      }
      const preview = previewLines.join(' ');
      throw new BadRequestException(
        `Không nhận diện được cột bắt buộc trên ${MAX_HEADER_SCAN} dòng đầu. Cần đủ 3 cột: danh mục (vd: category_vi, Danh mục), tên món (vd: product_vi, Tên món), giá (vd: price, Giá). ` +
          (preview ? `${preview} ` : '') +
          'Tải file mẫu từ hệ thống hoặc đặt tên cột tương đương như file mẫu.',
      );
    }

    const parsed: { rowIndex: number; data: ParsedRow }[] = [];
    const rowErrors: { row: number; message: string }[] = [];

    /** Dòng dữ liệu bắt đầu sau dòng tiêu đề (Excel: headerRowIndex + 1 là tiêu đề, +2 là dữ liệu đầu) */
    const firstDataRowNumber = headerRowIndex + 2;

    for (let rowNumber = firstDataRowNumber; rowNumber <= rows.length; rowNumber++) {
      if (parsed.length >= MAX_ROWS) break;

      const rowData = rows[rowNumber - 1];
      if (!rowData) continue;

      const get = (k: keyof ParsedRow): string => {
        const col = colMap[k];
        if (col == null || col === undefined) return '';
        const v = rowData[col];
        return cellToImportString(v);
      };

      const categoryVi = get('categoryVi');
      const productVi = get('productVi');
      const priceRaw = get('price');

      if (!categoryVi && !productVi && !priceRaw) {
        continue;
      }

      if (!productVi) {
        rowErrors.push({ row: rowNumber, message: 'Thiếu tên món (product_vi)' });
        continue;
      }
      if (!categoryVi) {
        rowErrors.push({ row: rowNumber, message: 'Thiếu danh mục (category_vi)' });
        continue;
      }

      const price = this.parsePrice(priceRaw);
      if (price === null || price < 0) {
        rowErrors.push({ row: rowNumber, message: `Giá không hợp lệ: "${priceRaw}"` });
        continue;
      }

      const categoryKo = get('categoryKo') || categoryVi;
      const productKo = get('productKo') || productVi;
      const descriptionVi = get('descriptionVi') || '-';
      const descriptionKo = get('descriptionKo') || '';
      const imageUrl = get('imageUrl');

      parsed.push({
        rowIndex: rowNumber,
        data: {
          categoryVi: categoryVi.trim(),
          categoryKo: categoryKo.trim() || categoryVi.trim(),
          productVi: productVi.trim(),
          productKo: productKo.trim() || productVi.trim(),
          price,
          descriptionVi: descriptionVi.trim() || '-',
          descriptionKo: descriptionKo.trim(),
          imageUrl: imageUrl.trim(),
        },
      });
    }

    if (parsed.length === 0) {
      throw new BadRequestException('Không có dòng dữ liệu hợp lệ sau dòng tiêu đề.');
    }

    let categoriesCreated = 0;
    let categoriesReused = 0;
    let productsCreated = 0;
    let imagesFromUrls = 0;

    await this.tenantSchemaService.runInTenant(restaurantId, async (manager) => {
      const catRepo = manager.getRepository(TenantCategory);
      const prodRepo = manager.getRepository(TenantProduct);

      const nameToCategory = new Map<string, TenantCategory>();

      const existing = await catRepo.find({ where: { deletedAt: IsNull() } });
      for (const c of existing) {
        nameToCategory.set(nameKey(c.name), c);
      }

      const uniqueCategoryNames = [...new Set(parsed.map((p) => p.data.categoryVi))];
      for (const catName of uniqueCategoryNames) {
        const key = nameKey(catName);
        if (nameToCategory.has(key)) {
          categoriesReused++;
          continue;
        }
        const rowForCat = parsed.find((p) => nameKey(p.data.categoryVi) === key);
        if (!rowForCat) continue;
        const created = await catRepo.save(
          catRepo.create({
            name: rowForCat.data.categoryVi.slice(0, 100),
            nameKo: rowForCat.data.categoryKo.slice(0, 100),
            isActive: true,
          }),
        );
        nameToCategory.set(key, created);
        categoriesCreated++;
      }

      for (const { data, rowIndex } of parsed) {
        const cat = nameToCategory.get(nameKey(data.categoryVi));
        if (!cat) {
          rowErrors.push({ row: rowIndex, message: 'Không tìm thấy danh mục sau khi tạo' });
          continue;
        }
        try {
          const saved = await prodRepo.save(
            prodRepo.create({
              name: data.productVi.slice(0, 200),
              nameKo: data.productKo.slice(0, 200),
              price: data.price,
              description: data.descriptionVi.slice(0, 1000),
              descriptionKo: data.descriptionKo.slice(0, 1000),
              categoryId: cat.id,
              category: cat.name,
              categoryKo: cat.nameKo,
              visible: true,
              available: true,
              sales: 0,
            }),
          );
          productsCreated++;

          if (data.imageUrl?.trim()) {
            try {
              const uploadResult = await this.uploadService.saveImageFromUrl(
                data.imageUrl.trim(),
                'products',
              );
              saved.image = uploadResult.url.slice(0, 500);
              await prodRepo.save(saved);
              imagesFromUrls++;
            } catch (imgErr: unknown) {
              const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
              rowErrors.push({
                row: rowIndex,
                message: `Món đã tạo nhưng ảnh lỗi: ${msg}`,
              });
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          rowErrors.push({ row: rowIndex, message: msg });
        }
      }
    });

    return {
      categoriesCreated,
      categoriesReused,
      productsCreated,
      imagesFromUrls,
      rowErrors,
    };
  }

  /** OOXML .xlsx là ZIP, byte đầu thường là PK (0x50 0x4b) */
  private bufferLooksLikeXlsx(buf: Buffer): boolean {
    if (!buf?.length || buf.length < 4) return false;
    return buf[0] === 0x50 && buf[1] === 0x4b;
  }

  private parsePrice(raw: string): number | null {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim().replace(/\s/g, '');
    if (/^\d+$/.test(s)) return parseFloat(s);
    // 55.000 — phân cách nghìn (VN)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      return parseFloat(s.replace(/\./g, ''));
    }
    if (/^\d{1,3}(,\d{3})+$/.test(s)) {
      return parseFloat(s.replace(/,/g, ''));
    }
    // Thập phân: 12.5 hoặc 12,5
    if (/^\d+[.,]\d{1,4}$/.test(s)) {
      return parseFloat(s.replace(',', '.'));
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}
