import Redis from "ioredis";

export const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

export const setSession = async (userId: string, token: string) => {
  await redis.set(`session:${userId}`, token);
};

export const getSession = async (userId: string) => {
  return redis.get(`session:${userId}`);
};
