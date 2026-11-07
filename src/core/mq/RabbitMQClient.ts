import amqp, { Channel, ChannelModel, Options } from 'amqplib';
import { config } from '../../config/env.config';
import { logger } from '../utils/logger';

export interface RabbitMQOptions {
  url?: string;
  enableFallback?: boolean;
}

export interface PublishOptions extends Options.Publish {
  contentType?: string;
}

interface InMemoryMessage {
  exchange: string;
  routingKey: string;
  content: any;
  timestamp: Date;
  headers?: Record<string, any>;
}

export class RabbitMQClient {
  private url: string;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private isConnected = false;
  private enableFallback: boolean;
  private isFallbackMode = false;

  // In-Memory fallback structures
  private memoryQueues: Map<string, InMemoryMessage[]> = new Map();
  private memoryBindings: Array<{ exchange: string; queue: string; pattern: string }> = new Array();
  private memoryConsumers: Map<string, Array<(msg: any) => Promise<void> | void>> = new Map();

  constructor(options: RabbitMQOptions = {}) {
    this.url = options.url || config.RABBITMQ_URL;
    this.enableFallback = options.enableFallback ?? true;
  }

  /**
   * Initialize connection to RabbitMQ with fallback support
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      logger.info(`Connecting to RabbitMQ at ${this.url}...`);
      this.connection = await amqp.connect(this.url, { timeout: 2000 });
      this.channel = await this.connection.createChannel();
      this.isConnected = true;
      this.isFallbackMode = false;
      logger.info('Connected to RabbitMQ broker successfully.');

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', { error: err.message });
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed.');
        this.isConnected = false;
      });
    } catch (err: any) {
      if (this.enableFallback) {
        logger.warn(
          `RabbitMQ broker unavailable (${err.message}). Activating In-Memory AMQP Broker Simulator for hermetic test execution.`
        );
        this.isFallbackMode = true;
        this.isConnected = true;
      } else {
        logger.error(`Failed to connect to RabbitMQ broker: ${err.message}`);
        throw err;
      }
    }
  }

  public isUsingFallback(): boolean {
    return this.isFallbackMode;
  }

  /**
   * Assert an exchange
   */
  public async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' | 'headers' = 'topic',
    options: Options.AssertExchange = { durable: false }
  ): Promise<void> {
    await this.ensureConnected();
    if (this.isFallbackMode) {
      logger.debug(`[Mock AMQP] Declared exchange '${exchange}' (${type})`);
      return;
    }
    await this.channel!.assertExchange(exchange, type, options);
  }

  /**
   * Assert a queue
   */
  public async assertQueue(
    queue: string,
    options: Options.AssertQueue = { durable: false, autoDelete: true }
  ): Promise<{ queue: string; messageCount: number; consumerCount: number }> {
    await this.ensureConnected();
    if (this.isFallbackMode) {
      if (!this.memoryQueues.has(queue)) {
        this.memoryQueues.set(queue, []);
      }
      logger.debug(`[Mock AMQP] Declared queue '${queue}'`);
      return { queue, messageCount: this.memoryQueues.get(queue)!.length, consumerCount: 0 };
    }
    return await this.channel!.assertQueue(queue, options);
  }

  /**
   * Bind queue to exchange with a routing key pattern
   */
  public async bindQueue(queue: string, exchange: string, pattern: string = ''): Promise<void> {
    await this.ensureConnected();
    if (this.isFallbackMode) {
      this.memoryBindings.push({ exchange, queue, pattern });
      logger.debug(`[Mock AMQP] Bound queue '${queue}' to exchange '${exchange}' with pattern '${pattern}'`);
      return;
    }
    await this.channel!.bindQueue(queue, exchange, pattern);
  }

  /**
   * Publish a message to an exchange
   */
  public async publish<T = any>(
    exchange: string,
    routingKey: string,
    message: T,
    options: PublishOptions = {}
  ): Promise<boolean> {
    await this.ensureConnected();

    if (this.isFallbackMode) {
      logger.debug(`[Mock AMQP] Published message to '${exchange}' -> '${routingKey}'`, { message });
      const inMsg: InMemoryMessage = {
        exchange,
        routingKey,
        content: message,
        timestamp: new Date(),
        headers: options.headers,
      };

      // Route message to matched queues
      for (const binding of this.memoryBindings) {
        if (binding.exchange === exchange && this.matchesRoutingKey(binding.pattern, routingKey)) {
          let q = this.memoryQueues.get(binding.queue);
          if (!q) {
            q = [];
            this.memoryQueues.set(binding.queue, q);
          }
          q.push(inMsg);

          // Dispatch to active listeners
          const listeners = this.memoryConsumers.get(binding.queue) || [];
          for (const listener of listeners) {
            setTimeout(async () => {
              try {
                await listener(inMsg.content);
              } catch (err: any) {
                logger.error(`[Mock AMQP] Consumer error on queue ${binding.queue}: ${err.message}`);
              }
            }, 10);
          }
        }
      }
      return true;
    }

    const buffer = Buffer.from(typeof message === 'string' ? message : JSON.stringify(message));
    return this.channel!.publish(exchange, routingKey, buffer, {
      contentType: 'application/json',
      timestamp: Date.now(),
      ...options,
    });
  }

  /**
   * Consume messages from a queue
   */
  public async consume<T = any>(
    queue: string,
    onMessage: (data: T) => Promise<void> | void,
    options: Options.Consume = { noAck: true }
  ): Promise<void> {
    await this.ensureConnected();

    if (this.isFallbackMode) {
      let consumers = this.memoryConsumers.get(queue);
      if (!consumers) {
        consumers = [];
        this.memoryConsumers.set(queue, consumers);
      }
      consumers.push(onMessage);

      // Process existing buffered messages in queue
      const buffered = this.memoryQueues.get(queue) || [];
      while (buffered.length > 0) {
        const msg = buffered.shift();
        if (msg) {
          await onMessage(msg.content);
        }
      }
      return;
    }

    await this.channel!.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        try {
          const raw = msg.content.toString();
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          await onMessage(parsed);
          if (!options.noAck) {
            this.channel!.ack(msg);
          }
        } catch (err: any) {
          logger.error(`Error processing message from ${queue}:`, { error: err.message });
          if (!options.noAck) {
            this.channel!.nack(msg, false, false);
          }
        }
      },
      options
    );
  }

  /**
   * Asynchronously wait for a specific message matching a condition on a queue
   */
  public async waitForMessage<T = any>(
    queue: string,
    predicate: (msg: T) => boolean = () => true,
    timeoutMs = 5000
  ): Promise<T> {
    await this.ensureConnected();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout of ${timeoutMs}ms waiting for message on queue '${queue}'`));
      }, timeoutMs);

      this.consume<T>(queue, (msg: T) => {
        if (predicate(msg)) {
          clearTimeout(timer);
          resolve(msg);
        }
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Purge a queue
   */
  public async purgeQueue(queue: string): Promise<void> {
    await this.ensureConnected();
    if (this.isFallbackMode) {
      this.memoryQueues.set(queue, []);
      return;
    }
    await this.channel!.purgeQueue(queue);
  }

  /**
   * Disconnect and release channels/connections
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (err: any) {
      logger.warn(`Error during RabbitMQ cleanup: ${err.message}`);
    } finally {
      this.isConnected = false;
      this.isFallbackMode = false;
      this.memoryQueues.clear();
      this.memoryBindings = [];
      this.memoryConsumers.clear();
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private matchesRoutingKey(pattern: string, key: string): boolean {
    if (pattern === '#' || pattern === '' || pattern === key) return true;
    const regexPattern = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+').replace(/#/g, '.*') + '$';
    return new RegExp(regexPattern).test(key);
  }
}

export const defaultRabbitMQClient = new RabbitMQClient();
