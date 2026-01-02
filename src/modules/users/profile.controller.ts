import { Response } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import userRepository from './user.repository';

export default class ProfileController {
  static async me(req: AuthRequest, res: Response) {
    const user = await userRepository.findById(req.userId!);
    res.json({
      id: user?._id,
      name: user?.name,
      email: user?.email,
    });
  }
}
