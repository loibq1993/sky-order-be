import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SePayPgClient } from 'sepay-pg-node';
import { Tenant } from '../entities/tenant.entity';
import {
  buildSepayTransferContent,
  getTenantSepaySettings,
  isSepayPgEnabledForTenant,
} from './sepay-config.util';

export interface SepayPgCheckoutPayload {
  checkoutUrl: string;
  formFields: Record<string, string | number>;
}

@Injectable()
export class SepayPgService {
  isEnabledForTenant(tenant: Tenant): boolean {
    return isSepayPgEnabledForTenant(tenant);
  }

  private clientForTenant(tenant: Tenant): SePayPgClient {
    const settings = getTenantSepaySettings(tenant);
    if (!settings.pgMerchantId || !settings.pgSecretKey) {
      throw new ServiceUnavailableException('SePay PG chưa cấu hình merchant_id / secret_key');
    }
    return new SePayPgClient({
      env: settings.pgEnv === 'production' ? 'production' : 'sandbox',
      merchant_id: settings.pgMerchantId,
      secret_key: settings.pgSecretKey,
    });
  }

  buildCheckoutForOrder(params: {
    tenant: Tenant;
    orderNumber: string;
    amount: number;
    frontendOrigin: string;
    orderId: string;
    restaurantId: string;
    paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';
  }): SepayPgCheckoutPayload {
    if (!this.isEnabledForTenant(params.tenant)) {
      throw new ServiceUnavailableException(
        'SePay PG chưa bật (Admin → Cài đặt → SePay → Cổng thanh toán).',
      );
    }

    const settings = getTenantSepaySettings(params.tenant);
    const invoiceNumber = buildSepayTransferContent(
      params.orderNumber,
      settings.orderCodePrefix,
    );
    const origin = params.frontendOrigin.replace(/\/$/, '');
    const qs = new URLSearchParams({
      orderId: params.orderId,
      restaurantId: params.restaurantId,
    });
    const returnBase = `${origin}/payment/sepay/return?${qs.toString()}`;

    const client = this.clientForTenant(params.tenant);
    const rawFields = client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: params.paymentMethod || 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: Math.round(params.amount),
      currency: 'VND',
      order_description: `Thanh toan don hang ${invoiceNumber}`,
      success_url: `${returnBase}&result=success`,
      error_url: `${returnBase}&result=error`,
      cancel_url: `${returnBase}&result=cancel`,
    });

    const formFields: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(rawFields)) {
      if (value !== undefined && value !== null) {
        formFields[key] = value as string | number;
      }
    }

    return {
      checkoutUrl: client.checkout.initCheckoutUrl(),
      formFields,
    };
  }
}
