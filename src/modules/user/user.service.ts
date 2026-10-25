import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import config from "../../config/index.js";
import { CreateUserPayload } from "./user.interface.js";

const createUserIntoDB = async (payload: CreateUserPayload) => {
  const { name, email, password, role, profilePhoto, phone, bio } = payload;

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds),
  );

  if (!role) {
    throw Object.assign(new Error("Role field must be filled before register!"), {
      statusCode: 400,
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    throw Object.assign(new Error("user already Exists."), { statusCode: 409 });
  }

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      profile: {
        create: {
          profilePhoto,
          phone,
          bio,
        },
      },
    },
    omit: {
      password: true,
    },
    include: {
      profile: true,
    },
  });

  return createdUser;
};

const getAllUsersFromDB = async () => {
  const users = await prisma.user.findMany({
    omit: {
      password: true,
    },
    include: {
      profile: true,
    },
  });

  return users;
};

export const userService = {
  createUserIntoDB,
  getAllUsersFromDB,
};
