import { Consultation } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { createStripePaymentIntent } from "../../../helpers/stripe.helper";
import { parse } from "date-fns";

const bookConsultationInDB = async (
  payload: any,
  userId: string,
): Promise<Consultation> => {
  const {
    consultationType,
    consultationMode,
    date,
    startTime,
    paymentMethodId,
  } = payload;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Basic validation
  if (!["THIRTY_MINUTES", "ONE_HOUR"].includes(consultationType)) {
    throw new ApiError(400, "Invalid consultation duration");
  }

  if (!["TEAMS", "PHONE"].includes(consultationMode)) {
    throw new ApiError(400, "Invalid consultation mode");
  }

  let consultationFee = await prisma.consultationFee.findFirst();
  if (!consultationFee) {
    consultationFee = await prisma.consultationFee.create({
      data: {
        phoneThirtyMinutesFee: 49,
        phoneOneHourFee: 89,
        teamsThirtyMinutesFee: 69,
        teamsOneHourFee: 119,
      },
    });
  }

  const totalAmount =
    consultationMode === "PHONE"
      ? consultationType === "THIRTY_MINUTES"
        ? consultationFee.phoneThirtyMinutesFee
        : consultationFee.phoneOneHourFee
      : consultationType === "THIRTY_MINUTES"
        ? consultationFee.teamsThirtyMinutesFee
        : consultationFee.teamsOneHourFee;

  // 1. FIRST: Create Stripe Customer (if not exists/valid) & Create + Confirm Payment Intent
  const paymentIntent = await createStripePaymentIntent(
    user.id,
    paymentMethodId,
    totalAmount as number,
  );

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(400, "Payment failed. Please try again.");
  }

  // 2. THEN: Proceed with the rest (dates, meeting setup, DB record, and reminders)
  const consultationDate = parse(
    `${date} ${startTime}`,
    "yyyy-MM-dd hh:mm a",
    new Date(),
  );

  if (Number.isNaN(consultationDate.getTime())) {
    throw new ApiError(400, "Invalid consultation date");
  }

  if (consultationDate <= new Date()) {
    throw new ApiError(400, "Consultation time must be in the future");
  }

  let teamsMeetingId = "test-meeting-id";
  let teamsJoinUrl =
    "https://teams.microsoft.com/l/meetup-join/test-meeting-id";

  // if (consultationMode === "TEAMS") {
  //   const teamsMeeting = await createTeamsMeeting({
  //     subject: `Consultation with ${user.fullName || user.email}`,
  //     startDate: consultationDate,
  //     durationMinutes: consultationType === "THIRTY_MINUTES" ? 30 : 60,
  //     attendeeEmail: user.email,
  //   });
  //   teamsMeetingId = teamsMeeting.teamsMeetingId;
  //   teamsJoinUrl = teamsMeeting.teamsJoinUrl;
  // }

  const consultation = await prisma.consultation.create({
    data: {
      userId,
      consultationMode,
      consultationType,
      amountPaid: totalAmount as number,
      scheduledAt: consultationDate,
      status: "CONFIRMED",
      stripePaymentId: paymentIntent.id,
      teamsMeetingId,
      teamsJoinUrl,
    },
  });

  return consultation;
};

const getCurrentConsultationFees = async () => {
  let consultationFee = await prisma.consultationFee.findFirst({
    omit: {
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!consultationFee) {
    consultationFee = await prisma.consultationFee.create({
      data: {
        phoneThirtyMinutesFee: 49,
        phoneOneHourFee: 89,
        teamsThirtyMinutesFee: 69,
        teamsOneHourFee: 119,
      },
    });
  }

  return consultationFee;
};

const updateConsultationFees = async (payload: any) => {
  const consultationFee = await prisma.consultationFee.findFirst();
  if (!consultationFee) {
    throw new Error("Consultation fees not found");
  }

  await prisma.consultationFee.update({
    where: {
      id: consultationFee.id,
    },
    data: {
      phoneThirtyMinutesFee:
        payload.phoneThirtyMinutesFee ?? consultationFee.phoneThirtyMinutesFee,
      phoneOneHourFee:
        payload.phoneOneHourFee ?? consultationFee.phoneOneHourFee,
      teamsThirtyMinutesFee:
        payload.teamsThirtyMinutesFee ?? consultationFee.teamsThirtyMinutesFee,
      teamsOneHourFee:
        payload.teamsOneHourFee ?? consultationFee.teamsOneHourFee,
    },
  });

  return;
};

const getAllConsultations = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  search?: string,
) => {
  const where: any = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [total, consultations] = await Promise.all([
    prisma.consultation.count({ where }),
    prisma.consultation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { scheduledAt: "desc" },
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

  const items = consultations.map((c) => {
    const scheduled = new Date(c.scheduledAt);
    return {
      id: c.id,
      name: c.user?.fullName || "User",
      avatar: c.user?.profileImage || "https://i.pravatar.cc/150?u=" + c.userId,
      email: c.user?.email || "",
      date: scheduled.toISOString().split("T")[0],
      time: scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      status: c.status,
      payment: c.stripePaymentId ? "Paid" : "Pending",
      amountPaid: c.amountPaid,
      consultationType: c.consultationType,
      consultationMode: c.consultationMode,
      teamsJoinUrl: c.teamsJoinUrl,
      user: c.user,
    };
  });

  return {
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    items,
    consultations: items,
  };
};

const getAllPayments = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  const where: any = {
    amountPaid: { gt: 0 },
    ...(search && {
      OR: [
        { stripePaymentId: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [total, consultations] = await Promise.all([
    prisma.consultation.count({ where }),
    prisma.consultation.findMany({
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

  const items = consultations.map((c) => {
    const created = new Date(c.createdAt);
    const dateFormatted = `${created.toISOString().split("T")[0]} ${created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    const plan = c.consultationType === "THIRTY_MINUTES" ? "30-Min Consultation" : "60-Min Consultation";

    return {
      id: c.id,
      transactionId: c.stripePaymentId || `TXN-${c.id.slice(-6).toUpperCase()}`,
      profileImage: c.user?.profileImage || "https://i.pravatar.cc/150?u=" + c.userId,
      userName: c.user?.fullName || "User",
      planName: plan,
      amount: `$${c.amountPaid} CAD`,
      date: dateFormatted,
      paymentMethod: "Stripe",
      status: "Active",
      rawAmount: c.amountPaid,
      createdAt: c.createdAt,
    };
  });

  return {
    meta: {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    },
    items,
    payments: items,
  };
};

const updateConsultationStatus = async (id: string, status: any) => {
  return prisma.consultation.update({
    where: { id },
    data: { status },
  });
};

export async function seedConsultationFees() {
  try {
    const consultationFee = await prisma.consultationFee.findFirst();
    if (consultationFee) {
      console.log("Consultation fees already seeded. Skipping.");
      return;
    }

    await prisma.consultationFee.create({
      data: {
        phoneThirtyMinutesFee: 50,
        phoneOneHourFee: 90,
        teamsThirtyMinutesFee: 70,
        teamsOneHourFee: 120,
      },
    });

    console.log(`✅ Consultation fees seeded successfully`);
  } catch (error) {
    console.error("Failed:", error);
  }
}

const getMyConsultations = async (userId: string) => {
  const consultations = await prisma.consultation.findMany({
    where: { userId },
    orderBy: { scheduledAt: "desc" },
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
  });

  return consultations.map((c) => {
    const scheduled = new Date(c.scheduledAt);
    return {
      id: c.id,
      name: c.user?.fullName || "User",
      avatar: c.user?.profileImage || "https://i.pravatar.cc/150?u=" + c.userId,
      email: c.user?.email || "",
      date: scheduled.toISOString().split("T")[0],
      time: scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      status: c.status,
      amountPaid: c.amountPaid,
      consultationType: c.consultationType,
      consultationMode: c.consultationMode,
      teamsJoinUrl: c.teamsJoinUrl,
      scheduledAt: c.scheduledAt,
      createdAt: c.createdAt,
    };
  });
};

export const consultationService = {
  bookConsultationInDB,
  getCurrentConsultationFees,
  updateConsultationFees,
  getAllConsultations,
  getMyConsultations,
  getAllPayments,
  updateConsultationStatus,
};
