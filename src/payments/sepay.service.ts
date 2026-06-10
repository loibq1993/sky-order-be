import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Tenant } from '../entities/tenant.entity';
import {
  buildSepayQrImageUrl,
  buildSepayTransferContent,
  getTenantSepaySettings,
  isSepayVietQrEnabledForTenant,
} from './sepay-config.util';

@Injectable()
export class SepayService {
  isEnabledForTenant(tenant: Tenant): boolean {
    return isSepayVietQrEnabledForTenant(tenant);
  }

  buildQrForOrder(tenant: Tenant, orderNumber: string, amount: number): {
    transferContent: string;
    qrImageUrl: string;
    amount: number;
  } {
    const settings = getTenantSepaySettings(tenant);
    if (!isSepayVietQrEnabledForTenant(tenant) || !settings.accountNumber || !settings.bankCode) {
      throw new ServiceUnavailableException('SePay VietQR is not configured for this restaurant');
    }
    const transferContent = buildSepayTransferContent(orderNumber);
    const qrImageUrl = buildSepayQrImageUrl({
      accountNumber: settings.accountNumber,
      bankCode: settings.bankCode,
      amount,
      transferContent,
    });
    return {
      transferContent,
      qrImageUrl,
      amount: Math.round(amount),
    };
  }
}
