export function formatCollectionLabel(
  name: string,
  parentName?: string | null,
): string {
  return parentName ? `${parentName} › ${name}` : name;
}
