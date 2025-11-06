import {Document, model, Schema} from "mongoose"


export interface IUser extends Document{
    id:string;
    name:string;
    email:string;
    password:string;
    isAdmin:boolean;
    blocked:boolean;
    createdAt?:Date;
    updatedAt?:Date;
}



const userSchema = new Schema<IUser>({
    name:{
        type:String, required:true
    },
    email:{
        type:String, required:true
    },
    password:{
        type:String, required:true
    },
    isAdmin:{
        type:Boolean, required:true , default:false
    },
    blocked:{
        type:Boolean, required:true, default:false
    }
}, {
    timestamps:true
})



const User = model<IUser>("users", userSchema);


export default User;

