import {
  PromotionDiscountMode,
  PromotionType,
  TenantProductPromotion,
} from '../entities/tenant/tenant-product-promotion.entity';
import { isHappyHourActive } from './promotion-schedule';

export interface ResolvedPromotion {
  promotionId: string;
  promotionName: string;
  originalPrice: number;
  salePrice: number;
  discountAmount: number;
  label: string;
}

export function computePromotionLabel(
  mode: PromotionDiscountMode,
  discountValue: number,
): string {
  if (mode === 'percentage') return `-${Math.round(discountValue)}%`;
  if (mode === 'fixed_amount') {
    return `-${Math.round(discountValue).toLocaleString('vi-VN')}đ`;
  }
  return `${Math.round(discountValue).toLocaleString('vi-VN')}đ`;
}

export function computeSalePrice(
  originalPrice: number,
  promo: TenantProductPromotion,
): { salePrice: number; discountAmount: number } {
  const price = Number(originalPrice);
  const value = Number(promo.discountValue);

  if (promo.discountMode === 'percentage') {
    let discount = (price * value) / 100;
    if (promo.maxDiscountAmount != null) {
      discount = Math.min(discount, Number(promo.maxDiscountAmount));
    }
    discount = Math.round(discount * 100) / 100;
    return {
      salePrice: Math.max(0, Math.round((price - discount) * 100) / 100),
      discountAmount: discount,
    };
  }

  if (promo.discountMode === 'fixed_amount') {
    const discount = Math.min(value, price);
    return {
      salePrice: Math.max(0, Math.round((price - discount) * 100) / 100),
      discountAmount: discount,
    };
  }

  // fixed_price
  const salePrice = Math.min(value, price);
  return {
    salePrice: Math.round(salePrice * 100) / 100,
    discountAmount: Math.round((price - salePrice) * 100) / 100,
  };
}

export function isPricePromotionType(type: PromotionType): boolean {
  return type === 'standard' || type === 'happy_hour';
}

export function pickBestPromotion(
  originalPrice: number,
  promos: TenantProductPromotion[],
  now = new Date(),
): ResolvedPromotion | null {
  let best: { resolved: ResolvedPromotion; priority: number } | null = null;

  for (const promo of promos) {
    const promoType = promo.promotionType ?? 'standard';
    if (!isPricePromotionType(promoType)) continue;
    if (promoType === 'happy_hour' && !isHappyHourActive(promo, now)) continue;
    const { salePrice, discountAmount } = computeSalePrice(originalPrice, promo);
    if (discountAmount <= 0) continue;

    const candidate: ResolvedPromotion = {
      promotionId: promo.id,
      promotionName: promo.name,
      originalPrice: priceRound(originalPrice),
      salePrice,
      discountAmount,
      label: computePromotionLabel(promo.discountMode, promo.discountValue),
    };

    if (
      !best ||
      candidate.salePrice < best.resolved.salePrice ||
      (candidate.salePrice === best.resolved.salePrice && promo.priority > best.priority)
    ) {
      best = { resolved: candidate, priority: promo.priority };
    }
  }

  return best?.resolved ?? null;
}

function priceRound(n: number): number {
  return Math.round(n * 100) / 100;
}
