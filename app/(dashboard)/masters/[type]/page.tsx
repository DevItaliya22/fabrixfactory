import { notFound } from "next/navigation";

import { MastersManager } from "@/components/masters/masters-manager";
import { isMasterType, MASTER_LABELS } from "@/lib/masters-config";

export default async function MasterTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isMasterType(type)) notFound();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {MASTER_LABELS[type]}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {type === "collection"
            ? "Top-level collections and nested sub-collections for grouping products."
            : `Manage ${MASTER_LABELS[type].toLowerCase()} used across products.`}
        </p>
      </div>
      <MastersManager type={type} />
    </>
  );
}
