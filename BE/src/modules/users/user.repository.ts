import userModel, { IUser } from "./user.model";
class UserRepository {
    async create(user: IUser) {
        return userModel.create(user);
    }
    async findByEmail(email: string) {
        return userModel.findOne({ email });
    }
    async findById(id: string) {
        return userModel.findById(id);
    }
    async findAll(query: any = {}) {
        return userModel.find(query).select("-password");
    }
    async count() {
        return userModel.countDocuments();
    }
    async updateById(id: string, updateData: Partial<IUser>) {
        return userModel.findByIdAndUpdate(id, updateData, { new: true });
    }
}
export default new UserRepository();