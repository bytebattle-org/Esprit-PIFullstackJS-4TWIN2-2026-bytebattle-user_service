declare module 'eureka-js-client' {
  export interface EurekaInstanceConfig {
    app: string;
    hostName: string;
    ipAddr: string;
    port: {
      $: number;
      '@enabled': boolean;
    };
    vipAddress: string;
    dataCenterInfo: {
      '@class': string;
      name: string;
    };
    statusPageUrl?: string;
    healthCheckUrl?: string;
    homePageUrl?: string;
  }

  export interface EurekaClientConfig {
    host: string;
    port: number;
    servicePath: string;
    maxRetries?: number;
    requestRetryDelay?: number;
  }

  export interface EurekaConfig {
    instance: EurekaInstanceConfig;
    eureka: EurekaClientConfig;
  }

  export interface EurekaInstance {
    app: string;
    hostName: string;
    ipAddr: string;
    port?: {
      $: number;
    };
    vipAddress: string;
  }

  export class Eureka {
    constructor(config: EurekaConfig);
    start(callback?: (error?: Error) => void): void;
    stop(callback?: () => void): void;
    getInstancesByAppId(appId: string): EurekaInstance[];
  }
}
