import { NextFunction, Request, Response } from "express";
import httpstatus from "http-status-codes";

export const notFound = (req: Request, res: Response, _next: NextFunction) => {
  res.status(httpstatus.NOT_FOUND).json({
    success: false,
    statusCode: httpstatus.NOT_FOUND,
    message: `Route ${req.method} ${req.originalUrl} not found!`,
  });
};
