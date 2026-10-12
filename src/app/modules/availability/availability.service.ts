import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";

function normalizeTimeString(time: string) {
  const trimmedTime = time.trim();
  const match = trimmedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time format: ${time}`);
  }

  let normalizedHour = hour % 12;
  if (period === "PM") {
    normalizedHour += 12;
  }

  if (period === "AM" && hour === 12) {
    normalizedHour = 0;
  }

  return {
    hour: normalizedHour,
    minute,
    formatted: `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`,
  };
}


function getHourBucket(time: string) {
  return normalizeTimeString(time).hour;
}

function hasSameHourConflict(newStart: string, existingStart: string) {
  return getHourBucket(newStart) === getHourBucket(existingStart);
}

function parseSlotToTime(time: string) {
  return normalizeTimeString(time).formatted;
}

const getAvailabilityByWorkerId = async (workerId: string) => {
  const slots = await prisma.availability.findMany({
    where: { workerId },
    omit: {
      workerId: true,
    },
    include: {
      slots: {
        select: {
          id: true,
          startTime: true,
        },
      },
    },
  });

  return slots;
};

const createNewSlot = async (dayOfWeek: number, startTime: string) => {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new ApiError(
      400,
      "Invalid dayOfWeek. It should be a number between 0 and 6.",
    );
  }

  const normalizedStartTime = parseSlotToTime(startTime);

  const availability = await prisma.availability.findMany({
    where: { dayOfWeek },
    include: {
      slots: {
        select: {
          startTime: true,
        },
      },
    },
  });

  if (!availability.length) {
    throw new ApiError(404, `No availability found for dayOfWeek ${dayOfWeek}`);
  }

  const hasConflict = availability.some((entry) =>
    entry.slots.some((slot) =>
      hasSameHourConflict(normalizedStartTime, slot.startTime),
    ),
  );

  if (hasConflict) {
    throw new ApiError(400,
      `A slot already exists in the same one-hour window for this day: ${normalizedStartTime}`,
    );
  }

  const firstAvailability = availability[0];

  await prisma.availableSlot.create({
    data: {
      availabilityId: firstAvailability.id,
      startTime: normalizedStartTime,
    },
  });

  return;
};

const deleteSlot = async (slotId: string) => {
  await prisma.availableSlot.delete({
    where: { id: slotId },
  });

  return;
};

const DEFAULT_SLOT_TIMES = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "12:00 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "6:00 PM",
];

const getDayWiseSlots = async (dayOfWeekParam: number | string) => {
  const dayOfWeek = typeof dayOfWeekParam === "string" ? parseInt(dayOfWeekParam, 10) : dayOfWeekParam;
  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new ApiError(
      400,
      "Invalid dayOfWeek. It should be a number between 0 and 6.",
    );
  }
  const availability = await prisma.availability.findFirst({
    where: { dayOfWeek },
    select: {
      id: true,
      slots: {
        select: {
          id: true,
          startTime: true,
        },
      },
    },
  });

  if (!availability || !availability.slots.length) {
    return {
      id: availability?.id || `default_day_${dayOfWeek}`,
      slots: DEFAULT_SLOT_TIMES.map((time, idx) => ({
        id: `default_slot_${dayOfWeek}_${idx}`,
        startTime: time,
      })),
    };
  }

  return availability;
};

export async function seedAvailability() {
  try {
    const admin = await prisma.user.findFirst({
      where: {
        role: "Admin",
      },
    });

    if (!admin) {
      console.log("[seedAvailability] No admin found. Skipping.");
      return;
    }

    const existingAvailability = await prisma.availability.findFirst({
      where: {
        workerId: admin.id,
      },
    });

    if (existingAvailability) {
      console.log("Admin already has availability. Skipping.");
      return;
    }

    const availabilityData = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      workerId: admin.id,
      dayOfWeek,
    }));

    await prisma.availability.createMany({
      data: availabilityData,
    });

    console.log(`Created 7 days of availability for admin: ${admin.id}`);
  } catch (error) {
    console.error("Failed:", error);
  }
}

export const availabilityService = {
  getAvailabilityByWorkerId,
  createNewSlot,
  deleteSlot,
  getDayWiseSlots,
};
