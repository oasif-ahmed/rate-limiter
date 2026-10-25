import { NextFunction, Request, Response } from "express";
import httpstatus from "http-status-codes";
import { userService } from "./user.service.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = req.body;

    const user = await userService.createUserIntoDB(payload);

    sendResponse(res, {
      success: true,
      statusCode: httpstatus.CREATED,
      message: "user Created Successfully!",
      data: { user },
    });
  },
);

const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const users = await userService.getAllUsersFromDB();

    sendResponse(res, {
      success: true,
      statusCode: httpstatus.OK,
      message: "Users retrieved successfully!",
      data: { users },
    });
  },
);

export const userController = {
  createUser,
  getAllUsers,
};
