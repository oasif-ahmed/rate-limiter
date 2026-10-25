import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { IloginPayload } from "./auth.interface.js";
import { jwtUtils } from "../../utils/jwt.js";
import config from "../../config/index.js";
import { SignOptions } from "jsonwebtoken";
import { ActiveStatus } from "../../../generated/prisma/enums.js";

const loginUserDB = async (payload: IloginPayload) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw Object.assign(new Error("User not found!"), { statusCode: 401 });
  }

  if (user.activeStatus === ActiveStatus.SUSPEND) {
    throw Object.assign(new Error("Your account has been suspended!"), {
      statusCode: 403,
    });
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw Object.assign(new Error("Password is Incorrect!"), { statusCode: 401 });
  }

  // here is the part of creating JWT

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  // create jwt access token
  const jwtAccessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );

  // creating jwt refresh Token

  const jwtRefreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );
  const { password: _, ...safeUser } = user;
  return {
    user: safeUser,
    jwtAccessToken,
    jwtRefreshToken,
  };
};

export const authService = {
  loginUserDB,
};
