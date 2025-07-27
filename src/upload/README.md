# Upload Module

Module xử lý upload ảnh với phân chia folder và quản lý file tạm.

## Cấu trúc thư mục

```
public/
├── uploads/
│   ├── temp/          # File tạm (tự động dọn dẹp sau 24h)
│   ├── products/      # Ảnh sản phẩm
│   ├── categories/    # Ảnh danh mục
│   └── orders/        # Ảnh đơn hàng
└── images/            # Ảnh cũ (backward compatibility)
```

## API Endpoints

### 1. Upload ảnh
```http
POST /upload/image
Content-Type: multipart/form-data

Form Data:
- image: file
- folder: string (optional, default: 'temp')
```



### 6. Xóa ảnh
```http
DELETE /upload/delete?filename=abc.jpg&folder=temp
```

### 7. Liệt kê file trong folder
```http
GET /upload/list/products
```

### 8. Dọn dẹp file tạm
```http
POST /upload/cleanup
```

### 9. Serve ảnh
```http
GET /upload/products/abc.jpg
GET /upload/categories/def.jpg
```

## Quy trình sử dụng

### 1. Upload ảnh tạm
```javascript
// Frontend: Upload ảnh vào temp folder
const formData = new FormData();
formData.append('image', file);
formData.append('folder', 'temp'); // hoặc 'products', 'categories', 'orders'

const response = await fetch('/upload/image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.data.url = "/images/temp/abc-123.jpg"
```

### 2. Hiển thị ảnh preview
```javascript
// Hiển thị ảnh ngay lập tức
const imgElement = document.createElement('img');
imgElement.src = result.data.url;
```

### 3. Upload ảnh cho sản phẩm (với move tự động)
```javascript
// Bước 1: Upload ảnh vào temp folder
const formData = new FormData();
formData.append('image', file);
formData.append('folder', 'temp');

const response = await fetch('/upload/image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.data.filename = "1703123456789-my-image.jpg"

// Bước 2: Lưu sản phẩm với filename (sẽ tự động move)
const productData = {
  name: 'Sản phẩm mới',
  price: 10000,
  tempImageFilename: result.data.filename // Backend sẽ tự động move
};

await fetch('/admin/products', {
  method: 'POST',
  body: JSON.stringify(productData)
});
// Ảnh sẽ được tự động di chuyển từ temp sang products
```

## Tính năng

### ✅ Tự động tạo folder
- Tự động tạo các folder cần thiết khi khởi động
- Không cần tạo thủ công

### ✅ Validate file
- Chỉ chấp nhận ảnh (jpg, jpeg, png, gif, webp)
- Giới hạn kích thước 5MB
- Tên file unique với UUID

### ✅ Quản lý file tạm
- File tạm được lưu trong folder `temp/`
- Tự động dọn dẹp file cũ hơn 24h
- API dọn dẹp thủ công

### ✅ Phân chia folder
- `temp/`: File tạm
- `products/`: Ảnh sản phẩm
- `categories/`: Ảnh danh mục
- `orders/`: Ảnh đơn hàng

### ✅ Backward compatibility
- Vẫn serve được ảnh từ thư mục `images/` cũ
- Không ảnh hưởng đến code hiện tại

## Sử dụng trong Products Service

```typescript
// Trong products.service.ts
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProductsService {
  constructor(
    private uploadService: UploadService
  ) {}

  async create(createProductDto: CreateProductDto, tempImageFilename?: string) {
    // Tạo sản phẩm trước
    const product = this.productRepository.create(createProductDto);
    const savedProduct = await this.productRepository.save(product);

    // Tự động move ảnh từ temp sang products nếu có
    if (tempImageFilename) {
      try {
        const moveResult = await this.uploadService.moveFromTemp(tempImageFilename, 'products');
        savedProduct.image = moveResult.url;
        await this.productRepository.save(savedProduct);
      } catch (error) {
        console.error('Failed to move image:', error);
      }
    }

    return this.mapToResponseDto(savedProduct);
  }
}
```

## Cron Job dọn dẹp

Có thể setup cron job để tự động dọn dẹp file tạm:

```bash
# Chạy mỗi ngày lúc 2h sáng
0 2 * * * curl -X POST http://localhost:3000/upload/cleanup
``` 