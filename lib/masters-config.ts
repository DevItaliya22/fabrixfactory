export const MASTER_TYPES = [
  "colour",
  "width",
  "fabric",
  "tag",
  "collection",
  "care",
  "lengthPreset",
] as const;

export type MasterType = (typeof MASTER_TYPES)[number];

export const MASTER_LABELS: Record<MasterType, string> = {
  colour: "Colours",
  width: "Widths",
  fabric: "Fabric compositions",
  tag: "Tags",
  collection: "Collections",
  care: "Care instructions",
  lengthPreset: "Length presets",
};

export function isMasterType(value: string): value is MasterType {
  return MASTER_TYPES.includes(value as MasterType);
}
