"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CareMastersManager } from "@/components/masters/care-masters-manager";
import {
  buildMasterPayload,
  defaultMasterForm,
  MasterFormFields,
  str,
  type CollectionOption,
  PARENT_NONE,
  validateMasterForm,
} from "@/components/masters/master-form-fields";
import { formatCollectionLabel } from "@/lib/collections";
import { MASTER_LABELS, type MasterType } from "@/lib/masters-config";

type CollectionRow = CollectionOption & {
  description?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  _count?: { children: number };
  isActive?: boolean;
};

type MastersData = Record<MasterType, Record<string, unknown>[]>;

function getDisplayName(type: MasterType, item: Record<string, unknown>) {
  if (type === "width") return String(item.label ?? item.id);
  if (type === "care") return String(item.title ?? item.id);
  if (type === "lengthPreset") {
    return String(item.label ?? `${item.value} ${item.unit}`);
  }
  return String(item.name ?? item.id);
}

function itemToForm(
  type: MasterType,
  item: Record<string, unknown>,
): Record<string, string> {
  const isActive = item.isActive !== false ? "true" : "false";

  switch (type) {
    case "colour":
      return {
        name: str(item.name),
        hexCode: str(item.hexCode) || "#cccccc",
        isActive,
      };
    case "width":
      return {
        label: str(item.label),
        valueInCm: str(item.valueInCm),
        isActive,
      };
    case "fabric":
      return {
        name: str(item.name),
        description: str(item.description),
        isActive,
      };
    case "tag":
      return { name: str(item.name), isActive };
    case "collection": {
      const row = item as CollectionRow;
      const parentId = row.parent?.id ?? row.parentId;
      return {
        name: str(item.name),
        description: str(item.description),
        parentId: parentId ? String(parentId) : PARENT_NONE,
        isActive,
      };
    }
    case "care":
      return {
        title: str(item.title),
        description: str(item.description),
        isActive,
      };
    case "lengthPreset":
      return {
        label: str(item.label),
        value: str(item.value),
        unit: str(item.unit) || "METRE",
        isActive,
      };
  }
}

export function MastersManager({ type }: { type: MasterType }) {
  if (type === "care") {
    return <CareMastersManager />;
  }

  return <MastersManagerInner key={type} type={type} />;
}

function MastersManagerInner({ type }: { type: MasterType }) {
  const [data, setData] = useState<MastersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const isEditing = editingId != null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/masters");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json as MastersData);
    } catch {
      toast.error("Failed to load masters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/masters");
        const json = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setData(json as MastersData);
      } catch {
        if (!cancelled) toast.error("Failed to load masters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const items = data?.[type] ?? [];

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultMasterForm(type));
    setDialogOpen(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditingId(String(item.id));
    setForm(itemToForm(type, item));
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const error = validateMasterForm(type, form);
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = buildMasterPayload(type, form);

      if (!isEditing) {
        const res = await fetch("/api/masters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create");
        toast.success("Created");
      } else {
        const res = await fetch(`/api/masters/${type}/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update");
        toast.success("Saved");
      }

      setDialogOpen(false);
      setForm({});
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await fetch(`/api/masters/${type}/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const renderFormFields = () => {
    const collections = (data?.collection ?? []) as CollectionRow[];

    return (
      <MasterFormFields
        type={type}
        form={form}
        onChange={setForm}
        collections={collections}
        excludeCollectionId={editingId ?? undefined}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner />
        Loading masters…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openAdd}>
          Add {MASTER_LABELS[type].replace(/s$/, "")}
        </Button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setForm({});
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit" : "Add"}{" "}
              {MASTER_LABELS[type].replace(/s$/, "")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEditing ? "Update" : "Create"} a{" "}
              {MASTER_LABELS[type].toLowerCase()} entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">{renderFormFields()}</div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : isEditing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {type === "collection" ? (
              <>
                <TableHead>Parent</TableHead>
                <TableHead>Sub-collections</TableHead>
              </>
            ) : null}
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={type === "collection" ? 5 : 4}
                className="text-muted-foreground text-center"
              >
                No items yet
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const collection = item as CollectionRow;
              return (
                <TableRow key={String(item.id)}>
                  <TableCell>
                    {type === "collection"
                      ? formatCollectionLabel(
                          collection.name,
                          collection.parent?.name,
                        )
                      : getDisplayName(type, item)}
                  </TableCell>
                  {type === "collection" ? (
                    <>
                      <TableCell className="text-muted-foreground">
                        {collection.parent?.name ?? "—"}
                      </TableCell>
                      <TableCell>{collection._count?.children ?? 0}</TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    {item.isActive === false ? "No" : "Yes"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(String(item.id))}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
