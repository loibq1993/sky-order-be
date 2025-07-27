# Tables & QR Codes API

## Tổng quan
Module quản lý bàn và tạo QR code cho từng bàn để khách hàng có thể quét và đặt món.

## Cài đặt dependencies

```bash
npm install qrcode @types/qrcode
```

## Endpoints

### 1. Tạo bàn mới
```bash
POST /api/tables
```

**Request Body:**
```json
{
  "name": "Bàn 1",
  "tableNumber": 1,
  "capacity": 4,
  "description": "Bàn góc cửa sổ, view đẹp",
  "status": "available"
}
```

### 2. Tạo nhiều QR code cùng lúc
```bash
POST /api/tables/generate-qr-codes
```

**Request Body:**
```json
{
  "baseUrl": "https://sky-order.vercel.app/",
  "restaurantName": "Việt Phố",
  "count": 10
}
```

**Response:**
```json
{
  "message": "Generated 10 QR codes successfully",
  "tables": [
    {
      "id": "uuid",
      "name": "Bàn 0",
      "tableNumber": 0,
      "qrCodeUrl": "https://sky-order.vercel.app/api/tables/qr/0",
      "qrCodeImagePath": "/upload/qr-codes/table-0.png",
      "orderUrl": "https://sky-order.vercel.app/?id=0",
      "status": "available",
      "capacity": 4,
      "isActive": true
    }
  ]
}
```

### 3. Tạo QR code cho bàn cụ thể
```bash
POST /api/tables/1/generate-qr
```

**Request Body:**
```json
{
  "baseUrl": "https://sky-order.vercel.app/",
  "restaurantName": "Việt Phố"
}
```

### 4. Xem QR code image
```bash
GET /api/tables/qr/1
```

### 5. Cập nhật trạng thái bàn
```bash
PATCH /api/tables/{id}/status
```

**Request Body:**
```json
{
  "status": "occupied"
}
```

### 6. Xem tất cả bàn
```bash
GET /api/tables
```

### 7. Xem bàn theo số bàn
```bash
GET /api/tables/number/1
```

## Trạng thái bàn

- `available`: Bàn trống, có thể sử dụng
- `occupied`: Bàn đang có khách
- `reserved`: Bàn đã được đặt trước
- `maintenance`: Bàn đang bảo trì

## Cấu trúc QR Code

QR code chứa thông tin JSON:
```json
{
  "url": "https://sky-order.vercel.app/?id=1",
  "restaurant": "Việt Phố",
  "table": 1,
  "message": "Quét để đặt món"
}
```

## Quy trình sử dụng

### Bước 1: Tạo QR codes cho tất cả bàn
```bash
curl -X POST 'http://localhost:4500/api/tables/generate-qr-codes' \
  -H 'Content-Type: application/json' \
  -d '{
    "baseUrl": "https://sky-order.vercel.app/",
    "restaurantName": "Việt Phố",
    "count": 10
  }'
```

### Bước 2: In QR codes
- QR code images được lưu tại: `public/upload/qr-codes/table-{number}.png`
- Có thể truy cập qua: `http://localhost:4500/api/tables/qr/{number}`

### Bước 3: Khách hàng quét QR code
- QR code dẫn đến: `https://sky-order.vercel.app/?id={tableNumber}`
- Frontend sẽ nhận `tableNumber` từ URL parameter

### Bước 4: Quản lý trạng thái bàn
```bash
# Đánh dấu bàn có khách
curl -X PATCH 'http://localhost:4500/api/tables/{id}/status' \
  -H 'Content-Type: application/json' \
  -d '{"status": "occupied"}'

# Đánh dấu bàn trống
curl -X PATCH 'http://localhost:4500/api/tables/{id}/status' \
  -H 'Content-Type: application/json' \
  -d '{"status": "available"}'
```

## Tích hợp với Orders

Khi khách hàng đặt món qua QR code, frontend sẽ:
1. Lấy `tableNumber` từ URL parameter (`?id=1`)
2. Gửi order với thông tin bàn
3. Backend có thể liên kết order với bàn cụ thể

## Lưu ý

- QR code images được lưu trong thư mục `public/upload/qr-codes/`
- Mỗi bàn có QR code riêng với URL duy nhất
- Có thể tạo lại QR code cho bàn cụ thể nếu cần thay đổi thông tin 