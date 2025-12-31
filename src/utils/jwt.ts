import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES = '1d';

export const signToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};
export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
};