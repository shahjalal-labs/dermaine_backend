import prisma from "../../../shared/prisma";

const createSupport = async (
  payload:
    | {
        userId?: string;
        message: string;
        name?: string;
        email?: string;
        phone?: string;
        referralSource?: string;
      }
    | string,
  maybeMessage?: string,
) => {
  let userId: string | undefined;
  let message: string;
  let name: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let referralSource: string | undefined;

  if (typeof payload === "string") {
    userId = payload;
    message = maybeMessage || "";
  } else {
    userId = payload.userId;
    message = payload.message || "";
    name = payload.name;
    email = payload.email;
    phone = payload.phone;
    referralSource = payload.referralSource;
  }

  if (!userId && email) {
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });
    if (existing) userId = existing.id;
  }

  if (!userId) {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ["SuperAdmin", "Admin"] } },
    });
    if (admin) userId = admin.id;
  }

  if (!userId) {
    const anyUser = await prisma.user.findFirst();
    if (anyUser) userId = anyUser.id;
  }

  if (!userId) {
    throw new Error("No user found to associate with support message.");
  }

  const formattedMessage = [
    name ? `Name: ${name}` : null,
    email ? `Email: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
    referralSource ? `Referral: ${referralSource}` : null,
    message ? `Message: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await prisma.support.create({
    data: {
      userId,
      message: formattedMessage || message,
    },
  });

  return created;
};

const getAllSupportMessages = async (page: number = 1, limit: number = 10, search?: string) => {
  const where: any = search
    ? {
        OR: [
          { message: { contains: search, mode: "insensitive" } },
          { user: { fullName: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [total, supports] = await Promise.all([
    prisma.support.count({ where }),
    prisma.support.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    }),
  ]);

  const items = supports.map((s) => ({
    id: s.id,
    message: s.message,
    adminResponse: s.adminResponse,
    createdAt: s.createdAt,
    name: s.user?.fullName || "User",
    email: s.user?.email || "",
    avatar: s.user?.profileImage || "https://i.pravatar.cc/150?u=" + s.userId,
    date: new Date(s.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    user: s.user,
  }));

  return {
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    items,
    supports: items,
  };
};

const respondToSupport = async (id: string, adminResponse: string) => {
  return prisma.support.update({
    where: { id },
    data: { adminResponse },
  });
};

const deleteSupport = async (id: string) => {
  return prisma.support.delete({
    where: { id },
  });
};

export const supportService = {
  createSupport,
  getAllSupportMessages,
  respondToSupport,
  deleteSupport,
};
