import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { rateLimiter } from "./src/middleware/rateLimiter";
import { userRoutes, usersRoutes } from "./src/modules/user/user.route";
import { authRoute } from "./src/modules/auth/auth.route";
import { notFound } from "./src/middleware/notFound";
import { globalErrorHandler } from "./src/middleware/globalErrorHandler";

const app = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.json({ success: true, statusCode: 200, message: `Server is running...` });
});

app.get("/api/test", rateLimiter, (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    message: "Request allowed",
  });
});

app.use("/api/auth", userRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", authRoute);

// 404 for unknown routes
app.use(notFound);

// global error handler (must be last)
app.use(globalErrorHandler);

export default app;
