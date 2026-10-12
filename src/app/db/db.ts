import { UserRole } from "@prisma/client";
import prisma from "../../shared/prisma";
import bcrypt from "bcryptjs";
import config from "../../config";

export const initiateSuperAdmin = async () => {
  try {
    const isExistUser = await prisma.user.findUnique({
      where: {
        email: "superAdmin@gmail.com",
      },
    });

    if (isExistUser) {
      return isExistUser.id;
    }

    const saltRounds = Number(config.jwt.gen_salt) || 12;
    const hashedPassword = await bcrypt.hash("12345678", saltRounds);

    const admin = await prisma.user.create({
      data: {
        fullName: "Super Admin",
        email: "superAdmin@gmail.com",
        password: hashedPassword,
        role: UserRole.SuperAdmin,
        status: "Active",
      },
      select: {
        id: true,
      },
    });

    console.log("✅ SuperAdmin initialized successfully with ID:", admin.id);
    return admin.id;
  } catch (error) {
    console.error("Error initiating SuperAdmin:", error);
  }
};
