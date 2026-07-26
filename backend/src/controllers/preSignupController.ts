import type {Request, Response} from 'express';
import {PreSignSchema} from "../models/subscripeModel.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createPreSignup(
    req: Request, 
    res: Response,
){
    try {
        const email = req.body.email;

        if(!EMAIL_PATTERN.test(email)){
            return res.status(400).json({
                message: "Please provide a valid email address",
            });
        }

        const existingPreSignup = await PreSignSchema.findOne({email});

        if(existingPreSignup){
            return res.status(400).json({
                success:false,
                message: "This email has already been registered"
            });
        }

        await PreSignSchema.create({email});

        res.setHeader("Cache-Control", "no-store");

        return res.status(201).json({
            message: "Email registered successful", 
            success: true,
            
        });
    } catch (err: unknown) {
        return res.status(500).json({
            message: "Unable to register email."
        });
    }
}