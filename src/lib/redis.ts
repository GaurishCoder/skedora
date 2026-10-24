import Redis, { type RedisOptions } from "ioredis";

export function getRedisOptions(): RedisOptions {
  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      // Exponential backoff reconnect strategy (up to 3 seconds)
      const delay = Math.min(times * 150, 3000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNREFUSED", "ECONNRESET"];
      return targetErrors.some((target) => err.message.includes(target));
    },
  };

  return baseOptions;
}

export function createRedisConnection(customName = "skedora-redis"): Redis {
  const baseOptions = getRedisOptions();
  const redisUrl = process.env.REDIS_URL;

  const client = redisUrl
    ? new Redis(redisUrl, {
        ...baseOptions,
        connectionName: customName,
      })
    : new Redis({
        ...baseOptions,
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        username: process.env.REDIS_USERNAME || undefined,
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
        connectionName: customName,
      });

  client.on("error", (err) => {
    console.error(`[Redis Error - ${customName}]:`, err?.message || err);
  });

  return client;
}
