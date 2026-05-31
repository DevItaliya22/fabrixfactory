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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CareMastersManager } from "@/components/masters/care-masters-manager";
import { formatCollectionLabel } from "@/lib/collections";
import { MASTER_LABELS, type MasterType } from "@/lib/masters-config";

const PARENT_NONE = "__none__";

type CollectionRow = {
  id: string;
  name: string;
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

function str(value: unknown): string {
  if (value == null) return "";
  return String(value);
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

function defaultForm(type: MasterType): Record<string, string> {
  const base = { isActive: "true" };
  switch (type) {
    case "colour":
      return { ...base, hexCode: "#cccccc" };
    case "collection":
      return { ...base, parentId: PARENT_NONE };
    case "lengthPreset":
      return { ...base, unit: "METRE" };
    default:
      return base;
  }
}

function buildPayload(
  type: MasterType,
  form: Record<string, string>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    isActive: form.isActive !== "false",
  };

  switch (type) {
    case "colour":
      payload.name = form.name?.trim();
      payload.hexCode = form.hexCode?.trim() || null;
      break;
    case "width":
      payload.label = form.label?.trim();
      payload.valueInCm = form.valueInCm ? parseFloat(form.valueInCm) : null;
      break;
    case "fabric":
      payload.name = form.name?.trim();
      payload.description = form.description?.trim() || null;
      break;
    case "tag":
      payload.name = form.name?.trim();
      break;
    case "collection":
      payload.name = form.name?.trim();
      payload.description = form.description?.trim() || null;
      payload.parentId =
        form.parentId && form.parentId !== PARENT_NONE ? form.parentId : null;
      break;
    case "care":
      payload.title = form.title?.trim();
      payload.description = form.description?.trim() || null;
      break;
    case "lengthPreset":
      payload.label = form.label?.trim() || null;
      payload.value = parseFloat(form.value);
      payload.unit = form.unit || "METRE";
      break;
  }

  return payload;
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
    setForm(defaultForm(type));
    setDialogOpen(true);
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditingId(String(item.id));
    setForm(itemToForm(type, item));
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    switch (type) {
      case "colour":
        if (!form.name?.trim()) {
          toast.error("Name is required");
          return false;
        }
        break;
      case "width":
        if (!form.label?.trim()) {
          toast.error("Label is required");
          return false;
        }
        break;
      case "fabric":
      case "tag":
        if (!form.name?.trim()) {
          toast.error("Name is required");
          return false;
        }
        break;
      case "collection":
        if (!form.name?.trim()) {
          toast.error("Name is required");
          return false;
        }
        break;
      case "care":
        if (!form.title?.trim()) {
          toast.error("Title is required");
          return false;
        }
        break;
      case "lengthPreset":
        if (!form.value || Number.isNaN(parseFloat(form.value))) {
          toast.error("Valid length value is required");
          return false;
        }
        break;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = buildPayload(type, form);

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
    const parentOptions = collections.filter(
      (c) => !isEditing || c.id !== editingId,
    );

    const activeField = (
      <div className="flex items-center gap-3 pt-1">
        <Switch
          id="master-active"
          checked={form.isActive !== "false"}
          onCheckedChange={(checked) =>
            setForm({ ...form, isActive: checked ? "true" : "false" })
          }
        />
        <Label htmlFor="master-active">Active</Label>
      </div>
    );

    switch (type) {
      case "colour":
        return (
          <>
            <Field label="Name">
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Hex">
              <Input
                type="color"
                value={form.hexCode ?? "#cccccc"}
                onChange={(e) => setForm({ ...form, hexCode: e.target.value })}
                className="h-9 w-20"
              />
            </Field>
            {activeField}
          </>
        );
      case "width":
        return (
          <>
            <Field label="Label">
              <Input
                value={form.label ?? ""}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </Field>
            <Field label="cm (optional)">
              <Input
                type="number"
                value={form.valueInCm ?? ""}
                onChange={(e) =>
                  setForm({ ...form, valueInCm: e.target.value })
                }
              />
            </Field>
            {activeField}
          </>
        );
      case "fabric":
        return (
          <>
            <Field label="Name">
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description (optional)">
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            {activeField}
          </>
        );
      case "tag":
        return (
          <>
            <Field label="Name">
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            {activeField}
          </>
        );
      case "collection":
        return (
          <>
            <Field label="Name">
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Summer fabrics"
              />
            </Field>
            <Field label="Parent collection (optional)">
              <Select
                value={form.parentId ?? PARENT_NONE}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Top-level collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PARENT_NONE}>
                    None — top-level collection
                  </SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {formatCollectionLabel(c.name, c.parent?.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description (optional)">
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            {activeField}
          </>
        );
      case "care":
        return (
          <>
            <Field label="Title">
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            {activeField}
          </>
        );
      case "lengthPreset":
        return (
          <>
            <Field label="Label">
              <Input
                value={form.label ?? ""}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </Field>
            <Field label="Value">
              <Input
                type="number"
                value={form.value ?? ""}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </Field>
            <Field label="Unit">
              <Select
                value={form.unit ?? "METRE"}
                onValueChange={(v) => setForm({ ...form, unit: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="METRE">Metre</SelectItem>
                  <SelectItem value="YARD">Yard</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {activeField}
          </>
        );
    }
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
