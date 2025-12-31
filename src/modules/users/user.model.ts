import { Schema, model } from "mongoose";
export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
}
const UserSchema = new Schema<IUser>({
      _id: { type: String, required: true },
 name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
 password: {
  type: String,
  required: true,
  minlength: 6,
  validate: {
    validator: (v: string) => /^(?=.*[A-Z]).{6,}$/.test(v),
    message: 'Password must be at least 6 characters long and contain at least 1 uppercase letter'
  }
}

}, { timestamps: true });
export default model<IUser>('User',UserSchema);
