import { z } from 'zod';

export const OrderItemSchema = z.object({
  productId: z.string(),
  name: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const CreateOrderRequestSchema = z.object({
  userId: z.string(),
  items: z.array(OrderItemSchema).min(1),
  currency: z.string().default('USD'),
  shippingAddress: z.string().min(5),
});
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  items: z.array(OrderItemSchema),
  currency: z.string(),
  totalAmount: z.number().positive(),
  status: OrderStatusSchema,
  shippingAddress: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListResponseSchema = z.object({
  total: z.number().nonnegative(),
  data: z.array(OrderSchema),
});
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;
