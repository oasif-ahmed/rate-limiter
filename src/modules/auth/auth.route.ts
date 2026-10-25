import { Router } from "express";
import { authController } from "./auth.controller.js";

const router = Router();

router.post("/login", authController.loginUser);

export const authRoute = router;