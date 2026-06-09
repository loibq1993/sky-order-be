import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { msUntilNextVnSchedule } from './order-date.util';

@Injectable()
export class OrdersDayCloseScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersDayCloseScheduler.name);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('ORDER_AUTO_CLOSE_ENABLED is off — skip day-close scheduler');
      return;
    }
    this.scheduleNext();
    this.logger.log(
      `Day-close scheduler active (VN ${this.getHour()}:${String(this.getMinute()).padStart(2, '0')})`,
    );
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private isEnabled(): boolean {
    const raw = this.configService.get<string>('ORDER_AUTO_CLOSE_ENABLED');
    return raw === '1' || raw === 'true';
  }

  private getHour(): number {
    return Number(this.configService.get('ORDER_AUTO_CLOSE_VN_HOUR') ?? 0);
  }

  private getMinute(): number {
    return Number(this.configService.get('ORDER_AUTO_CLOSE_VN_MINUTE') ?? 5);
  }

  private scheduleNext(): void {
    const delay = msUntilNextVnSchedule(this.getHour(), this.getMinute());
    this.timer = setTimeout(() => {
      void this.runCloseJob().finally(() => this.scheduleNext());
    }, delay);
  }

  private async runCloseJob(): Promise<void> {
    try {
      const { closedCount } =
        await this.ordersService.autoClosePreviousDayUnpaidOrders();
      if (closedCount > 0) {
        this.logger.log(
          `Auto-closed ${closedCount} stale unpaid order(s) from previous day(s)`,
        );
      }
    } catch (err) {
      this.logger.error('Day-close job failed', err);
    }
  }
}
