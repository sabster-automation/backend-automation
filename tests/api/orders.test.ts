import { describe, it, expect } from 'vitest';
import { orderService } from '../../src/services/OrderService';
import { ApiError } from '../../src/core/http/ApiClient';

describe('Orders API Endpoints', () => {
  it('should list existing orders', async () => {
    const res = await orderService.getOrders();
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.data[0]).toHaveProperty('orderId');
    expect(res.data[0]).toHaveProperty('totalAmount');
  });

  it('should create an order and verify total calculation', async () => {
    const payload = {
      userId: 'user-001',
      items: [
        { productId: 'ITEM-1', name: 'Keyboard', quantity: 2, unitPrice: 25.5 },
        { productId: 'ITEM-2', name: 'Mouse', quantity: 1, unitPrice: 15.0 },
      ],
      currency: 'USD',
      shippingAddress: '456 Tech Park Way, Austin, TX',
    };

    const expectedTotal = 2 * 25.5 + 1 * 15.0; // 66.0
    const created = await orderService.createOrder(payload);

    expect(created.orderId).toBeDefined();
    expect(created.userId).toBe('user-001');
    expect(created.totalAmount).toBe(expectedTotal);
    expect(created.status).toBe('PENDING');
    expect(created.items.length).toBe(2);

    // Fetch created order
    const fetched = await orderService.getOrderById(created.orderId);
    expect(fetched.orderId).toBe(created.orderId);
    expect(fetched.totalAmount).toBe(expectedTotal);
  });

  it('should allow status update / cancellation of an order', async () => {
    const payload = {
      userId: 'user-002',
      items: [{ productId: 'ITEM-3', name: 'Monitor', quantity: 1, unitPrice: 299.99 }],
      currency: 'USD',
      shippingAddress: '789 Pine Road, Seattle, WA',
    };

    const created = await orderService.createOrder(payload);
    expect(created.status).toBe('PENDING');

    const cancelled = await orderService.cancelOrder(created.orderId);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.updatedAt).toBeDefined();
  });

  it('should return 400 when items array is empty', async () => {
    try {
      await orderService.createOrder({
        userId: 'user-001',
        items: [],
        currency: 'USD',
        shippingAddress: '123 Test St',
      });
      expect.unreachable('Should have thrown 400 ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });
});
