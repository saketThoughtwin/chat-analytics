import userModel,{IUser} from "./user.model";
class UserRepository {
    async create(user:IUser){
        return userModel.create(user);
    }
    async findByEmail(email:string){
        return userModel.findOne({email});
    }
    async findById(id:string){
        return userModel.findById(id);
    }
};
export default new UserRepository();