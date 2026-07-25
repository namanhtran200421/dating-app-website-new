import type{ Request, Response} from 'express';
import {ContactMessageSchema} from "../models/contactModel.js";

export async function createContact(
    req: Request, 
    res: Response,
) {
    try {
        const newContact = await ContactMessageSchema.create(req.body);
        return res.status(201).json({
            data: newContact,
            message: "Contact message saved successfully",
            success: true,
        });

    }catch (err:any){
        return res.status(500).json({ message: "Unable to save contact message", success: false });
    }
}

export async function listContact(req:Request, res:Response){
    try {
        let contacts = await ContactMessageSchema.find({});
        if(!contacts){
            return res.status(400).json({message:"Failure to fetch contacts", success:false})
        }
        return res.status(200).json({success:true, data:contacts, message:"success fetched"})

    } catch (err:any){
        return res.status(400).json({message:"Failure to fetch contacts", success:false})
    }
}
