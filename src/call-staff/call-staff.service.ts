import { Injectable } from '@nestjs/common';

export interface StaffCall {
  tableNumber: string;
  calledAt: number;
}

@Injectable()
export class CallStaffService {
  private readonly callsByRestaurant = new Map<string, StaffCall[]>();

  addCall(restaurantId: string, tableNumber: string): void {
    const list = this.callsByRestaurant.get(restaurantId) ?? [];
    list.push({ tableNumber: tableNumber || '?', calledAt: Date.now() });
    this.callsByRestaurant.set(restaurantId, list);
  }

  getCallsSince(restaurantId: string, since: number): StaffCall[] {
    const list = this.callsByRestaurant.get(restaurantId) ?? [];
    return list.filter((c) => c.calledAt > since);
  }
}
