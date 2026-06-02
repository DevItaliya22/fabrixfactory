import {
  AddCircleIcon,
  ColorsIcon,
  CollectionsBookmarkIcon,
  GridIcon,
  HorizontalResizeIcon,
  MaterialAndTextureIcon,
  Package01Icon,
  RulerIcon,
  Tag01Icon,
  WashingMachineIcon,
} from "@hugeicons/core-free-icons";

import type { MasterType } from "@/lib/masters-config";

export const MASTER_NAV_ICONS: Record<MasterType, typeof ColorsIcon> = {
  colour: ColorsIcon,
  width: HorizontalResizeIcon,
  fabric: MaterialAndTextureIcon,
  tag: Tag01Icon,
  collection: CollectionsBookmarkIcon,
  care: WashingMachineIcon,
  lengthPreset: RulerIcon,
};

export const productListIcon = Package01Icon;
export const productAddIcon = AddCircleIcon;
export const designNavIcon = GridIcon;
