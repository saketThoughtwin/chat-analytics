import { Response } from 'express';
import { AuthRequest } from '@middlewares/auth.middleware';
import userRepository from '@modules/users/user.repository';

export default class ProfileController {
  static async me(req: AuthRequest, res: Response) {
    const user = await userRepository.findById(req.userId!);
    res.json({
      id: user?._id,
      name: user?.name,
      email: user?.email,
      avatar: user?.avatar,
    });
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    const { name } = req.body;
    const removeAvatar = req.body?.removeAvatar === 'true' || req.body?.removeAvatar === true;
    let updateData: any = {};

    if (name) updateData.name = name;
    if (req.file?.path) updateData.avatar = req.file.path;
    if (removeAvatar) updateData.avatar = "";

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: "No update provided" });
    }

    const user = await userRepository.updateById(req.userId!, updateData);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        avatar: user?.avatar,
      }
    });
  }
}
