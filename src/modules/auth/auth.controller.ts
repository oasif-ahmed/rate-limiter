import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync.js";
import { authService } from "./auth.service.js";
import { sendResponse } from "../../utils/sendResponse.js";
import httpstatus from "http-status-codes";

const loginUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const {user, jwtAccessToken, jwtRefreshToken} = await authService.loginUserDB(payload);

    res.cookie("accessToken", jwtAccessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 // 24 hour or 1 day
    });
    res.cookie("refreshToken", jwtRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7 // 24 hour or 1 day
    });

    sendResponse(res, {
        success: true,
        statusCode: httpstatus.OK,
        message: "User Logged in Successfully!",
        data: {
            user,
            jwtAccessToken,
            jwtRefreshToken
        }
    })
})

export const authController = {
    loginUser
}