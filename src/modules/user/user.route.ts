import { Router } from "express";
import { userController } from "./user.controller.js";
import { auth } from "../../middleware/auth.js";
import { Role } from "../../../generated/prisma/enums.js";
import { rateLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.post("/register", userController.createUser);

export const userRoutes = router;

const usersRouter = Router();

usersRouter.get("/", auth(Role.CUSTOMER), rateLimiter, userController.getAllUsers);

export const usersRoutes = usersRouter;
