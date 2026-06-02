export const DESIGN_STORE_KEY = "fabrix-design-store";

export const DESIGN_MASTER_TYPES = ["fabric"] as const;

export type DesignMasterType = (typeof DESIGN_MASTER_TYPES)[number];

export const DESIGN_MASTER_LABELS: Record<DesignMasterType, string> = {
  fabric: "Fabrics",
};

export type FabricCompanyRate = {
  companyName: string;
  rate: string;
};

export type FabricMaster = {
  id: string;
  name: string;
  width: string;
  weight: string;
  companies: FabricCompanyRate[];
};

export type DesignEntry = {
  id: string;
  stitches: number[];
  areas: number[];
  fabricIds: string[];
};

export type DesignNumberRecord = {
  id: string;
  number: string;
  designs: DesignEntry[];
  createdAt: string;
  updatedAt: string;
};

export type DesignStore = {
  masters: {
    fabric: FabricMaster[];
  };
  designNumbers: DesignNumberRecord[];
};

function emptyMasters(): DesignStore["masters"] {
  return {
    fabric: [],
  };
}

function defaultStore(): DesignStore {
  return {
    masters: emptyMasters(),
    designNumbers: [],
  };
}

export function createId() {
  return crypto.randomUUID();
}

export function readDesignStore(): DesignStore {
  if (typeof window === "undefined") return defaultStore();

  try {
    const raw = localStorage.getItem(DESIGN_STORE_KEY);
    if (!raw) return defaultStore();

    const parsed = JSON.parse(raw) as Partial<DesignStore> & {
      masters?: Partial<DesignStore["masters"]> & Record<string, unknown>;
    };
    const masters = { ...emptyMasters(), ...parsed.masters };

    // Backwards-safe normalization for older stored shapes.
    masters.fabric = (masters.fabric ?? []).map((item: any) => ({
      id: String(item?.id ?? createId()),
      name: String(item?.name ?? ""),
      width: String(item?.width ?? ""),
      weight: String(item?.weight ?? ""),
      companies: Array.isArray(item?.companies)
        ? item.companies.map((c: any) => ({
            companyName: String(c?.companyName ?? ""),
            rate: String(c?.rate ?? ""),
          }))
        : [],
    }));

    return {
      masters,
      designNumbers: (parsed.designNumbers ?? []) as DesignNumberRecord[],
    };
  } catch {
    return defaultStore();
  }
}

export function writeDesignStore(store: DesignStore) {
  localStorage.setItem(DESIGN_STORE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("fabrix-design-store-changed"));
}

export function addFabricMaster(input: Omit<FabricMaster, "id">) {
  const store = readDesignStore();

  const name = input.name.trim();
  if (!name) return null;

  const master: FabricMaster = {
    id: createId(),
    name,
    width: input.width.trim(),
    weight: input.weight.trim(),
    companies: input.companies
      .map((c) => ({
        companyName: c.companyName.trim(),
        rate: c.rate.trim(),
      }))
      .filter((c) => c.companyName.length > 0 || c.rate.length > 0),
  };

  store.masters.fabric = [master, ...store.masters.fabric];
  writeDesignStore(store);
  return master;
}

export function updateFabricMaster(
  id: string,
  patch: Omit<FabricMaster, "id">,
) {
  const store = readDesignStore();
  store.masters.fabric = store.masters.fabric.map((item) => {
    if (item.id !== id) return item;
    const next: FabricMaster = {
      id,
      name: patch.name.trim(),
      width: patch.width.trim(),
      weight: patch.weight.trim(),
      companies: patch.companies
        .map((c) => ({
          companyName: c.companyName.trim(),
          rate: c.rate.trim(),
        }))
        .filter((c) => c.companyName.length > 0 || c.rate.length > 0),
    };
    return next;
  });
  writeDesignStore(store);
}

export function deleteFabricMaster(id: string) {
  const store = readDesignStore();
  store.masters.fabric = store.masters.fabric.filter((item) => item.id !== id);
  writeDesignStore(store);
}

export function upsertDesignNumber(
  input: Omit<DesignNumberRecord, "createdAt" | "updatedAt"> & {
    createdAt?: string;
  },
) {
  const store = readDesignStore();
  const now = new Date().toISOString();
  const existingIndex = store.designNumbers.findIndex(
    (item) => item.id === input.id,
  );

  if (existingIndex >= 0) {
    store.designNumbers[existingIndex] = {
      ...input,
      createdAt:
        input.createdAt ?? store.designNumbers[existingIndex].createdAt,
      updatedAt: now,
    };
  } else {
    store.designNumbers.unshift({
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  writeDesignStore(store);
}

export function deleteDesignNumber(id: string) {
  const store = readDesignStore();
  store.designNumbers = store.designNumbers.filter((item) => item.id !== id);
  writeDesignStore(store);
}

export function emptyDesignEntry(): DesignEntry {
  return {
    id: createId(),
    stitches: [],
    areas: [],
    fabricIds: [],
  };
}

export function fabricById(
  fabrics: FabricMaster[],
  id: string,
): FabricMaster | undefined {
  return fabrics.find((item) => item.id === id);
}
