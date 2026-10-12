import prisma from "../../../shared/prisma";

export interface IOccupationSynonym {
  id?: string;
  searchTerm: string;
  nocCode: string;
  occupationTitle?: string;
  priority?: number;
  isActive?: boolean;
}

// In-memory store for dynamic admin-added synonyms
const memorySynonyms: IOccupationSynonym[] = [];

const getAllOccupationSynonyms = async (query?: { search?: string }) => {
  // Pull from RuleOccupationCondition if any exists in database
  const ruleConditions = await prisma.ruleOccupationCondition.findMany({
    select: {
      id: true,
      occupationName: true,
      nocCode: true,
    },
    take: 100,
  });

  const dbSynonyms: IOccupationSynonym[] = ruleConditions
    .filter((rc) => rc.nocCode && rc.occupationName)
    .map((rc) => ({
      id: rc.id,
      searchTerm: rc.occupationName!,
      nocCode: rc.nocCode!,
      occupationTitle: rc.occupationName!,
      priority: 1,
      isActive: true,
    }));

  const allSynonyms = [...memorySynonyms, ...dbSynonyms];

  if (query?.search) {
    const s = query.search.toLowerCase();
    return allSynonyms.filter(
      (item) =>
        item.searchTerm.toLowerCase().includes(s) ||
        item.nocCode.includes(s) ||
        (item.occupationTitle && item.occupationTitle.toLowerCase().includes(s)),
    );
  }

  return allSynonyms;
};

const createOccupationSynonym = async (payload: IOccupationSynonym) => {
  const item: IOccupationSynonym = {
    id: `syn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    searchTerm: payload.searchTerm,
    nocCode: payload.nocCode,
    occupationTitle: payload.occupationTitle || payload.searchTerm,
    priority: payload.priority ?? 1,
    isActive: payload.isActive ?? true,
  };
  memorySynonyms.unshift(item);
  return item;
};

const deleteOccupationSynonym = async (id: string) => {
  const idx = memorySynonyms.findIndex((item) => item.id === id);
  if (idx !== -1) {
    memorySynonyms.splice(idx, 1);
    return true;
  }
  return false;
};

export const occupationSynonymService = {
  deleteOccupationSynonym,
  getAllOccupationSynonyms,
  createOccupationSynonym,
};
