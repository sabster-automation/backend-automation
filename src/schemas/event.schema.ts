import { z } from 'zod';
import { OrderItemSchema } from './order.schema';

export const OrderCreatedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('ORDER_CREATED'),
  orderId: z.string(),
  userId: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  items: z.array(OrderItemSchema),
  timestamp: z.string(),
});
export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;

export const OrderStatusChangedEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('ORDER_STATUS_CHANGED'),
  orderId: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  timestamp: z.string(),
});
export type OrderStatusChangedEvent = z.infer<typeof OrderStatusChangedEventSchema>;
