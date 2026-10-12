import { PrismaClient } from "@prisma/client";
import config from "../src/config";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const assesmentTitle = [
    "Permanent Residence",
    "Study Permit",
    "Work Permit",
    "Family Sponsorship",
  ];
  const hashedPassword = await bcrypt.hash(
    "123456",
    Number(config.jwt.gen_salt),
  );

  // ADMIN
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      fullName: "Admin User",
      password: hashedPassword,
      role: "Admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "superAdmin@gmail.com" },
    update: {},
    create: {
      email: "superAdmin@gmail.com",
      fullName: "Super Admin",
      password: hashedPassword,
      role: "SuperAdmin",
    },
  });
  await prisma.organization.upsert({
    where: { billingEmail: "default@gmail.com" },
    update: {},
    create: {
      billingEmail: "default@gmail.com",   
      password: hashedPassword,
      plan: "Free",
      maxUsers: 5,
      maxAssessments: 5,
      maxReports: 5,
      billingName: "Default Organization",
      companyName: "Default Organization",
      notes: "Default Organization",
      slug: "default-organization",
      status: "Active",
      type: "Default",
      isSetup:true,

    },
  });

  for (const title of assesmentTitle) {
    await prisma.assesment.upsert({
      where: { title },
      update: {},
      create: {
        title,
      },
    });
  }

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
