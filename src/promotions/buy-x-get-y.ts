import { TenantProduct } from '../entities/tenant/tenant-product.entity';
import { TenantProductPromotion } from '../entities/tenant/tenant-product-promotion.entity';

export interface BuyXGetYOffer {
  promotionId: string;
  promotionName: string;
  buyQuantity: number;
  getQuantity: number;
  label: string;
}

export function buildBuyXGetYLabel(buy: number, get: number): string {
  return `Mua ${buy} tặng ${get}`;
}

export function promoMatchesProduct(
  promo: TenantProductPromotion,
  product: TenantProduct,
): boolean {
  if (promo.scope === 'product') return promo.productId === product.id;
  if (promo.scope === 'category') {
    return product.categoryId != null && promo.categoryId === product.categoryId;
  }
  return false;
}

export function pickBuyXGetYPromo(
  product: TenantProduct,
  promos: TenantProductPromotion[],
): TenantProductPromotion | null {
  const matching = promos.filter(
    (p) =>
      p.promotionType === 'buy_x_get_y' &&
      p.buyQuantity != null &&
      p.getQuantity != null &&
      p.buyQuantity > 0 &&
      p.getQuantity > 0 &&
      promoMatchesProduct(p, product),
  );
  if (!matching.length) return null;
  matching.sort((a, b) => b.priority - a.priority || b.createdAt.getTime() - a.createdAt.getTime());
  return matching[0];
}

export function calcFreeQuantityFromBuyXGetY(
  paidQuantity: number,
  buyQuantity: number,
  getQuantity: number,
): number {
  if (paidQuantity < buyQuantity) return 0;
  return Math.floor(paidQuantity / buyQuantity) * getQuantity;
}
