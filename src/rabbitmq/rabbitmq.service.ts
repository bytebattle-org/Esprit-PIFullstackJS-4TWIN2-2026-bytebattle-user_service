import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib/callback_api';
import { RABBITMQ_CONFIG } from './rabbitmq.config';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = RABBITMQ_CONFIG.exchanges.EVENTS;
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.logger.log('Connecting to RabbitMQ...');
        
        amqp.connect(RABBITMQ_CONFIG.url, (error, connection) => {
          if (error) {
            this.logger.error('Failed to connect to RabbitMQ:', error.message);
            this.isConnected = false;
            setTimeout(() => this.connect(), 5000);
            resolve();
            return;
          }

          this.connection = connection;

          connection.createChannel((error, channel) => {
            if (error) {
              this.logger.error('Failed to create channel:', error.message);
              this.isConnected = false;
              setTimeout(() => this.connect(), 5000);
              resolve();
              return;
            }

            this.channel = channel;

            // Create exchange
            channel.assertExchange(this.exchange, 'topic', { durable: true }, (error) => {
              if (error) {
                this.logger.error('Failed to assert exchange:', error.message);
                this.isConnected = false;
                setTimeout(() => this.connect(), 5000);
                resolve();
                return;
              }

              // Create queue for this service
              channel.assertQueue(RABBITMQ_CONFIG.queues.USER_EVENTS, { durable: true }, (error) => {
                if (error) {
                  this.logger.error('Failed to assert queue:', error.message);
                  this.isConnected = false;
                  setTimeout(() => this.connect(), 5000);
                  resolve();
                  return;
                }

                // Bind queue to listen for battle.started events
                channel.bindQueue(
                  RABBITMQ_CONFIG.queues.USER_EVENTS,
                  this.exchange,
                  RABBITMQ_CONFIG.events.BATTLE_STARTED,
                  {},
                  (error) => {
                    if (error) {
                      this.logger.error('Failed to bind queue to battle.started:', error.message);
                      this.isConnected = false;
                      setTimeout(() => this.connect(), 5000);
                      resolve();
                      return;
                    }

                    // Bind queue to listen for battle.finished events
                    channel.bindQueue(
                      RABBITMQ_CONFIG.queues.USER_EVENTS,
                      this.exchange,
                      RABBITMQ_CONFIG.events.BATTLE_FINISHED,
                      {},
                      (error) => {
                        if (error) {
                          this.logger.error('Failed to bind queue to battle.finished:', error.message);
                          this.isConnected = false;
                          setTimeout(() => this.connect(), 5000);
                          resolve();
                          return;
                        }

                        this.isConnected = true;
                        this.logger.log('✅ Connected to RabbitMQ');
                        resolve();
                      }
                    );
                  }
                );
              });
            });
          });
        });
      } catch (error) {
        this.logger.error('Error in connect:', error);
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
        resolve();
      }
    });
  }

  private async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (this.channel) {
          this.channel.close(() => {
            if (this.connection) {
              this.connection.close(() => {
                this.logger.log('Disconnected from RabbitMQ');
                resolve();
              });
            } else {
              resolve();
            }
          });
        } else if (this.connection) {
          this.connection.close(() => {
            this.logger.log('Disconnected from RabbitMQ');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        this.logger.error('Error disconnecting from RabbitMQ:', error);
        resolve();
      }
    });
  }

  /**
   * Publish an event to RabbitMQ
   */
  async publish(routingKey: string, data: any): Promise<void> {
    if (!this.isConnected || !this.channel) {
      this.logger.warn(`Cannot publish event ${routingKey}: Not connected to RabbitMQ`);
      return;
    }

    try {
      const message = JSON.stringify({
        ...data,
        timestamp: new Date(),
      });

      this.channel.publish(this.exchange, routingKey, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json',
      });

      this.logger.log(`📢 Published event: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}:`, error);
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(callback: (routingKey: string, data: any) => void): Promise<void> {
    if (!this.isConnected || !this.channel) {
      this.logger.warn('Cannot subscribe: Not connected to RabbitMQ');
      return;
    }

    try {
      this.channel.consume(
        RABBITMQ_CONFIG.queues.USER_EVENTS,
        async (msg) => {
          if (msg && this.channel) {
            const routingKey = msg.fields.routingKey;
            const data = JSON.parse(msg.content.toString());

            this.logger.log(`📥 Received event: ${routingKey}`);

            try {
              await callback(routingKey, data);
              this.channel.ack(msg);
            } catch (error) {
              this.logger.error(`Error processing event ${routingKey}:`, error);
              // Reject and requeue
              if (this.channel) {
                this.channel.nack(msg, false, true);
              }
            }
          }
        },
        { noAck: false },
      );

      this.logger.log('✅ Subscribed to events');
    } catch (error) {
      this.logger.error('Failed to subscribe to events:', error);
    }
  }

  /**
   * Emit user.created event
   */
  async emitUserCreated(event: any): Promise<void> {
    await this.publish(RABBITMQ_CONFIG.events.USER_CREATED, event);
  }

  /**
   * Emit user.updated event
   */
  async emitUserUpdated(event: any): Promise<void> {
    await this.publish(RABBITMQ_CONFIG.events.USER_UPDATED, event);
  }

  /**
   * Emit user.logged_in event
   */
  async emitUserLoggedIn(event: any): Promise<void> {
    await this.publish(RABBITMQ_CONFIG.events.USER_LOGGED_IN, event);
  }
}
