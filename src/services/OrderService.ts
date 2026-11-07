import { ApiClient, defaultApiClient, ApiResponse } from '../core/http/ApiClient';
import { assertSchema } from '../core/utils/schemaValidator';
import {
  Order,
  OrderSchema,
  CreateOrderRequest,
  OrderListResponse,
  OrderListResponseSchema,
} from '../schemas/order.schema';

export class OrderService {
  constructor(private client: ApiClient = defaultApiClient) {}

  public async getOrders(params: { userId?: string; status?: string } = {}): Promise<OrderListResponse> {
    const response = await this.client.get<OrderListResponse>('/api/v1/orders', { params });
    return assertSchema(OrderListResponseSchema, response.data, 'OrderListResponse');
  }

  public async getOrderById(orderId: string): Promise<Order> {
    const response = await this.client.get<Order>(`/api/v1/orders/${orderId}`);
    return assertSchema(OrderSchema, response.data, 'Order');
  }

  public async createOrder(payload: CreateOrderRequest): Promise<Order> {
    const response = await this.client.post<Order>('/api/v1/orders', payload);
    return assertSchema(OrderSchema, response.data, 'CreatedOrder');
  }

  public async cancelOrder(orderId: string): Promise<Order> {
    const response = await this.client.patch<Order>(`/api/v1/orders/${orderId}`, {
      status: 'CANCELLED',
    });
    return assertSchema(OrderSchema, response.data, 'CancelledOrder');
  }

  public async deleteOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/v1/orders/${orderId}`);
  }
}

export const orderService = new OrderService();
