import {Schema, model} from 'mongoose';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        maxlength:254,
        match:EMAIL_PATTERN
    }, 

}, { timestamps: true,
    strict:'throw'
}
);

export const PreSignSchema = model<PreSignup> ("PreSignup", preSignupSchema)