import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import userRepository from "./user.repository";

class UserService {
  async register(name: string, email: string, password: string) {
    const exist = await userRepository.findByEmail(email);
    if (exist) {
      throw new Error("Email already registered");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return userRepository.create({
      _id: uuid(),
      name,
      email,
      password: hashedPassword,
    });
  }
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }
  async searchUsers(query: string, currentUserId: string) {
    return userRepository.findAll({
      $and: [
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
          ],
        },
        { _id: { $ne: currentUserId } },
      ],
    });
  }
}
export default new UserService();
