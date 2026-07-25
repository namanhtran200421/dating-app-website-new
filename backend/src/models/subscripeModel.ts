import {Schema, model} from 'mongoose';

export interface PreSignup{
    email:string;
    createdAt: Date;
    updateAt: Date;
}

const preSignupSchema = new Schema<PreSignup>({
    email:{
        type:String, 
        required: true, 
        unique: true, 
        trim:true, 
    }, 

}, { timestamps: true,}
);

export const PreSignSchema = model<PreSignup> ("PreSignup", preSignupSchema)