import jwt from "jsonwebtoken";

export const signToken = (userId: string) => {
  return jwt.sign(
    { userId: String(userId) },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
};
