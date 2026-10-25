import { Role } from "../../../generated/prisma/enums.js";

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  profilePhoto?: string;
  phone?: string;
  bio?: string;
}
