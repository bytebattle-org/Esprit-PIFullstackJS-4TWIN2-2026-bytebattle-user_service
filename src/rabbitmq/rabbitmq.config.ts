export const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL || '##########',
  exchanges: {
    EVENTS: 'bytebattle.events',
  },
  queues: {
    USER_EVENTS: 'user.events',
  },
  events: {
    // Events this service emits
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_LOGGED_IN: 'user.logged_in',
    
    // Events this service listens to
    BATTLE_STARTED: 'battle.started',
    BATTLE_FINISHED: 'battle.finished',
  },
};
