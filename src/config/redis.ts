import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const commonConfig = {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
  connectTimeout: 10000,
  lazyConnect: false,
  tls: {}, // ⚡ Important for rediss:// connections
};

export const redis = redisUrl
  ? new Redis(redisUrl, commonConfig)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      ...commonConfig,
    });

// Event listeners
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("✅ Redis ready"));
redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Redis is required in production!");
  }
});
redis.on("close", () => console.warn("⚠️ Redis connection closed"));

// Helper functions
export const isRedisAvailable = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
};

export const setSession = async (userId: string, token: string) => {
  try {
    await redis.set(`session:${userId}`, token);
  } catch (error) {
    console.error("Error setting session:", error);
    throw error;
  }
};

export const getSession = async (userId: string) => {
  try {
    return await redis.get(`session:${userId}`);
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};
