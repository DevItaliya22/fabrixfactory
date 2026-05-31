import "server-only";

import { db } from "@/lib/db";

export async function resolveCollectionParentId(
  collectionId: string | undefined,
  parentId: string | null | undefined,
): Promise<string | null> {
  const parent = parentId?.trim() || null;
  if (!parent) return null;

  if (collectionId && parent === collectionId) {
    throw new Error("A collection cannot be its own parent");
  }

  const parentRow = await db.collection.findUnique({
    where: { id: parent },
    select: { id: true },
  });
  if (!parentRow) {
    throw new Error("Parent collection not found");
  }

  if (!collectionId) return parent;

  let currentId: string | null = parent;
  const seen = new Set<string>();
  while (currentId) {
    if (currentId === collectionId) {
      throw new Error("Cannot place a collection under its own sub-collection");
    }
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const ancestor: { parentId: string | null } | null =
      await db.collection.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
    currentId = ancestor?.parentId ?? null;
  }

  return parent;
}
