import { NextFunction, Request, Response } from "express";
import { ActiveStatus, Role } from "../../generated/prisma/enums.js";
import { catchAsync } from "../utils/catchAsync.js";
import { jwtUtils } from "../utils/jwt.js";
import config from "../config/index.js";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";


declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        id: string;
        role: Role
      }
    }
  }
}
export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken ? req.cookies.accessToken :
      req.headers.authorization?.startsWith("Bearer ") ?
     req.headers.authorization?.split(" ")[1] : req.headers.authorization;

     if(!token){
      throw Object.assign(
        new Error("you are not logged in. Please log in to access this resource!."),
        { statusCode: 401 },
      );
     };


     const verifiedToken = jwtUtils.verifyToken(
      token,
      config.jwt_access_secret,
    );


    if(!verifiedToken.success){
      throw Object.assign(new Error(verifiedToken.error), { statusCode: 401 });
    }

    const { id } = verifiedToken.data as JwtPayload;

    const user = await prisma.user.findUnique({
      where: {
        id,
      }
    });

    if(!user){
      throw Object.assign(new Error("User not found. Please login."), { statusCode: 401 });
    }
    if(user.activeStatus === ActiveStatus.SUSPEND){
      throw Object.assign(
        new Error("Your account has been blocked. Please contact support."),
        { statusCode: 403 },
      );
    }

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw Object.assign(new Error("You do not have the access to get the resource."), {
        statusCode: 403,
      });
    }

    req.user = {
      email: user.email,
      name: user.name,
      id: user.id,
      role: user.role
    }
    next();
  })
}