import Redis from 'ioredis';

const redis = new Redis({
  host: '127.0.0.1',
  port: 6379,
  db: 0,               // FORCE DB 0
});

export const setSession = async (userId: string, token: string) => {
  await redis.set(`session:${userId}`, token, 'EX', 60 * 60 * 24);
};

export const getSession = async (userId: string) => {
  return redis.get(`session:${userId}`);
};

export default redis;
