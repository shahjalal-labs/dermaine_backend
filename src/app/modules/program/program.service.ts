import { PrismaClient, Prisma, ProgramStatus } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateProgramInput {
  name: string;
  organizationId?: string;
  country?: string;
  province?: string;
  category?: string;
  description?: string;
  status?: ProgramStatus;
  assesmentId?: string;
}

export interface UpdateProgramInput extends Partial<CreateProgramInput> {}

export interface ListProgramsFilter {
  organizationId?: string;
  country?: string;
  category?: string;
  status?: ProgramStatus;
  search?: string;
  page?: number;
  limit?: number;
}

const createProgram = async (data: CreateProgramInput) => {
  return prisma.program.create({
    data: {
      ...data,
      country: data.country ?? "Canada",
      status: data.status ?? ProgramStatus.DRAFT,
    },
  });
};

const findAllPrograms = async (filter: ListProgramsFilter = {}) => {
  const { organizationId, country, category, status, search, page = 1, limit = 20 } = filter;

  const where: Prisma.ProgramWhereInput = {
    ...(organizationId && { organizationId }),
    ...(country && { country }),
    ...(category && { category }),
    ...(status && { status }),
    ...(search && {
      name: { contains: search, mode: "insensitive" },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.program.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { streams: true } },
      },
    }),
    prisma.program.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findProgramById = async (id: string) => {
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      streams: {
        orderBy: { priorityRanking: "desc" },
      },
    },
  });

  if (!program) {
    throw new Error(`Program with id ${id} not found`);
  }

  return program;
};

const updateProgram = async (id: string, data: UpdateProgramInput) => {
  await assertExists(id);

  return prisma.program.update({
    where: { id },
    data,
  });
};

const deleteProgram = async (id: string) => {
  await assertExists(id);

  const streamCount = await prisma.stream.count({ where: { programId: id } });
  if (streamCount > 0) {
    throw new Error(
      `Cannot delete program: ${streamCount} stream(s) still reference it. Delete or reassign streams first.`,
    );
  }

  return prisma.program.delete({ where: { id } });
};

const assertExists = async (id: string) => {
  const exists = await prisma.program.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    throw new Error(`Program with id ${id} not found`);
  }
};

export const programService = {
  createProgram,
  findAllPrograms,
  findProgramById,
  updateProgram,
  deleteProgram,
};