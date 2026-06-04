export interface VoucherCartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface VoucherFreeItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface VoucherApplyResult {
  voucher: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  discountAmount: number;
  finalTotal: number;
  subtotal: number;
  freeItem?: VoucherFreeItem;
}
