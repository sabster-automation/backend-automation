import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { defaultRabbitMQClient } from '../../src/core/mq/RabbitMQClient';
import { assertSchema } from '../../src/core/utils/schemaValidator';
import { OrderCreatedEvent, OrderCreatedEventSchema } from '../../src/schemas/event.schema';
import { DataGenerator } from '../../src/core/utils/dataGenerator';

describe('RabbitMQ Order Event Messaging', () => {
  const exchange = 'orders.exchange';
  const queue = 'orders.processing.queue';
  const routingKey = 'order.created';

  beforeAll(async () => {
    await defaultRabbitMQClient.assertExchange(exchange, 'topic');
    await defaultRabbitMQClient.assertQueue(queue);
    await defaultRabbitMQClient.bindQueue(queue, exchange, 'order.*');
    await defaultRabbitMQClient.purgeQueue(queue);
  });

  afterAll(async () => {
    await defaultRabbitMQClient.purgeQueue(queue);
  });

  it('should publish order.created event and successfully consume it', async () => {
    const rawOrderEvent = DataGenerator.orderEvent();
    const eventPayload: OrderCreatedEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'ORDER_CREATED',
      orderId: rawOrderEvent.orderId,
      userId: rawOrderEvent.userId,
      amount: rawOrderEvent.amount,
      currency: rawOrderEvent.currency,
      items: rawOrderEvent.items,
      timestamp: rawOrderEvent.timestamp,
    };

    // Prepare async listener before publishing
    const messagePromise = defaultRabbitMQClient.waitForMessage<OrderCreatedEvent>(
      queue,
      (msg) => msg.orderId === eventPayload.orderId,
      5000
    );

    // Publish event
    await defaultRabbitMQClient.publish(exchange, routingKey, eventPayload);

    // Await message consumption
    const received = await messagePromise;

    // Validate consumed event schema
    const validated = assertSchema(OrderCreatedEventSchema, received, 'ConsumedOrderEvent');
    expect(validated.orderId).toBe(eventPayload.orderId);
    expect(validated.amount).toBe(eventPayload.amount);
    expect(validated.eventType).toBe('ORDER_CREATED');
  });

  it('should purge queue successfully', async () => {
    await defaultRabbitMQClient.publish(exchange, routingKey, { ping: 'test' });
    await defaultRabbitMQClient.purgeQueue(queue);
  });
});
