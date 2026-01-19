import { Request,Response,NextFunction } from "express";
import { ApiError} from "@utils/ApiError";

export const globalErrorHandler = (
    err: any,
    req:Request,
    res: Response,
    next: NextFunction
) =>{
    if(err instanceof ApiError){
        return res.status(err.statusCode).json({  success: false,
      message: err.message});
    }
    console.error("🔥 UNEXPECTED ERROR:", err);
    return res.status(500).json({success:false, message:"Something Went Wrong"})
};