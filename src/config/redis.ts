import Redis from "ioredis";

// Redis configuration with environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // Add connection timeout
  connectTimeout: 10000,
  // Disable lazyConnect to fail fast if Redis is unavailable
  lazyConnect: false,
};

export const redis = new Redis(redisConfig);

// Handle Redis connection errors
redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL: Redis is required in production!");
  } else {
    console.warn("Redis is not available. Some features may not work properly.");
  }
});

redis.on("connect", () => {
  console.log("✓ Redis connected successfully");
});

redis.on("ready", () => {
  console.log("✓ Redis is ready to accept commands");
});

redis.on("close", () => {
  console.warn("Redis connection closed");
});

// Helper function to check if Redis is available
export const isRedisAvailable = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
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
