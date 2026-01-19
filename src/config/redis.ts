import Redis from "ioredis";

// Use the REDIS_URL variable which should point to the internal domain
const redis = new Redis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: 3,
  family: 0, // 👈 CRITICAL: Allows both IPv4 and IPv6 resolution
  retryStrategy(times: number) {
    return Math.min(times * 50, 2000);
  },
  connectTimeout: 15000, // 👈 Increased slightly for production handshakes
  lazyConnect: false,
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

export { redis };
