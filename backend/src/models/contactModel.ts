import {Schema, model} from 'mongoose';

export interface ContactMessage {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;

}

const contactMessageSchema = new Schema<ContactMessage>({
    firstName: {
        type:String, 
        required: true, 
        trim:true, 
        maxlength: 100,
    },
    lastName: {
        type:String, 
        required: true, 
        trim:true, 
        maxlength: 100,

    },
    email:{
        type:String, 
        required: true, 
        trim:true, 
    }, 
    subject: {
        type:String, 
        required:true, 
        trim:true, 
        maxlength: 100,
    },

    message: {
        type:String, 
        required:true, 
        trim:true, 
        maxlength: 5000,
    },

}, { timestamps: true })

export const ContactMessageSchema = model<ContactMessage>("Contact", contactMessageSchema);
