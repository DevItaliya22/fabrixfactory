export type CollectionNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parent?: { name: string } | null;
};

export function formatCollectionLabel(
  name: string,
  parentName?: string | null,
): string {
  return parentName ? `${parentName} › ${name}` : name;
}

export function getCollectionPathSlugs(
  collectionId: string,
  collections: CollectionNode[],
): string[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const path: string[] = [];
  let current = byId.get(collectionId);

  while (current) {
    path.unshift(current.slug);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

export function getCollectionPathNames(
  collectionId: string,
  collections: CollectionNode[],
): string[] {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const path: string[] = [];
  let current = byId.get(collectionId);

  while (current) {
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

export function formatProductUrl(
  pathSlugs: string[],
  productSlug: string,
): string {
  const parts = [...pathSlugs, productSlug].filter(Boolean);
  return parts.join("/");
}

export function getCollectionPathLabel(pathNames: string[]): string {
  return pathNames.join(" › ");
}
