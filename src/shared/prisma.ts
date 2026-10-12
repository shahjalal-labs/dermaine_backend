import { PrismaClient } from "@prisma/client";
import { initiateSuperAdmin } from "../app/db/db";

const prisma = new PrismaClient();

async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log("Prisma connected to the database successfully!");

    // initiate super admin
    initiateSuperAdmin();
  } catch (error) {
    console.error("Prisma connection failed:", error);
  }
}

connectPrisma();

export default prisma;
