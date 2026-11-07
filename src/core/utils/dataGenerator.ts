import { faker } from '@faker-js/faker';

export interface GeneratedUser {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'editor';
  department: string;
  isActive: boolean;
}

export interface GeneratedOrderEvent {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  timestamp: string;
}

export class DataGenerator {
  /**
   * Generate a random realistic user payload
   */
  static user(overrides: Partial<GeneratedUser> = {}): GeneratedUser {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      role: faker.helpers.arrayElement(['admin', 'user', 'editor'] as const),
      department: faker.commerce.department(),
      isActive: true,
      ...overrides,
    };
  }

  /**
   * Generate an order event payload for RabbitMQ
   */
  static orderEvent(overrides: Partial<GeneratedOrderEvent> = {}): GeneratedOrderEvent {
    return {
      orderId: faker.string.uuid(),
      userId: faker.string.uuid(),
      amount: parseFloat(faker.finance.amount({ min: 10, max: 1000, dec: 2 })),
      currency: 'USD',
      items: [
        {
          productId: faker.string.alphanumeric(8),
          quantity: faker.number.int({ min: 1, max: 5 }),
          unitPrice: parseFloat(faker.finance.amount({ min: 5, max: 200, dec: 2 })),
        },
      ],
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate random credentials
   */
  static credentials() {
    return {
      username: faker.internet.username(),
      password: `TestP@ss_${faker.string.alphanumeric(8)}`,
    };
  }
}
