import { Eureka } from 'eureka-js-client';

export const createEurekaClient = (
  appName: string,
  port: number,
  eurekaHost = 'localhost',
  eurekaPort = 8761,
) => {
  return new Eureka({
    instance: {
      app: appName,
      hostName: 'localhost',
      ipAddr: '127.0.0.1',
      port: {
        $: port,
        '@enabled': true,
      },
      vipAddress: appName,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
      statusPageUrl: `http://localhost:${port}/info`,
      healthCheckUrl: `http://localhost:${port}/health`,
      homePageUrl: `http://localhost:${port}/`,
    },
    eureka: {
      host: eurekaHost,
      port: eurekaPort,
      servicePath: '/eureka/apps/',
      maxRetries: 10,
      requestRetryDelay: 2000,
    },
  });
};
