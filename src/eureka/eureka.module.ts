import { Module, OnModuleInit, OnModuleDestroy, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createEurekaClient } from './eureka.config';
import { Eureka } from 'eureka-js-client';

@Injectable()
export class EurekaService implements OnModuleInit, OnModuleDestroy {
  private eurekaClient: Eureka;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const appName = this.configService.get('EUREKA_APP_NAME', 'USER-SERVICE');
    const port = this.configService.get('PORT', 3001);
    const eurekaHost = this.configService.get('EUREKA_HOST', 'localhost');
    const eurekaPort = this.configService.get('EUREKA_PORT', 8761);

    console.log(`Registering ${appName} with Eureka at ${eurekaHost}:${eurekaPort}`);

    this.eurekaClient = createEurekaClient(appName, port, eurekaHost, eurekaPort);

    this.eurekaClient.start((error) => {
      if (error) {
        console.error('Eureka registration failed:', error);
      } else {
        console.log(`✓ ${appName} successfully registered with Eureka`);
      }
    });
  }

  onModuleDestroy() {
    if (this.eurekaClient) {
      console.log('Deregistering from Eureka...');
      this.eurekaClient.stop();
    }
  }

  getClient(): Eureka {
    return this.eurekaClient;
  }
}

@Module({
  providers: [EurekaService],
  exports: [EurekaService],
})
export class EurekaModule {}
