"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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
import { cn } from "@/lib/utils";

type CareItem = {
  id: string;
  title: string;
  description?: string | null;
  isActive?: boolean;
};

type CareForm = {
  title: string;
  description: string;
  isActive: string;
};

const defaultForm = (): CareForm => ({
  title: "",
  description: "",
  isActive: "true",
});

function itemToForm(item: CareItem): CareForm {
  return {
    title: item.title ?? "",
    description: item.description ?? "",
    isActive: item.isActive !== false ? "true" : "false",
  };
}

export function CareMastersManager() {
  const [items, setItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CareForm>(defaultForm);
  const formRef = useRef<HTMLDivElement>(null);

  const isEditing = editingId != null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/masters");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setItems(json.care ?? []);
    } catch {
      toast.error("Failed to load care instructions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm());
  };

  const startAdd = () => {
    resetForm();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startEdit = (item: CareItem) => {
    setEditingId(item.id);
    setForm(itemToForm(item));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive !== "false",
      };

      if (!isEditing) {
        const res = await fetch("/api/masters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "care", ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create");
        toast.success("Care instruction created");
      } else {
        const res = await fetch(`/api/masters/care/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update");
        toast.success("Care instruction saved");
      }

      resetForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this care instruction?")) return;
    try {
      const res = await fetch(`/api/masters/care/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      toast.success("Deleted");
      if (editingId === id) resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner />
        Loading care instructions…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card ref={formRef} className="border-border/80">
        <CardHeader className="border-b pb-4">
          <CardTitle>
            {isEditing ? "Edit care instruction" : "Add care instruction"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the title and rich-text instructions below."
              : "Create washing and care guidance with formatted text."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Field label="Title" htmlFor="care-title">
            <Input
              id="care-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Machine wash cold"
            />
          </Field>
          <Field label="Instructions">
            <RichTextEditor
              id="care-description"
              value={form.description}
              onChange={(description) => setForm({ ...form, description })}
              placeholder="Washing, drying, and ironing instructions…"
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              id="care-active"
              checked={form.isActive !== "false"}
              onCheckedChange={(checked) =>
                setForm({ ...form, isActive: checked ? "true" : "false" })
              }
            />
            <Label htmlFor="care-active">Active</Label>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-4">
          {isEditing ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Spinner />
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Create instruction"
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          {items.length} instruction{items.length === 1 ? "" : "s"}
        </p>
        <Button type="button" variant="outline" onClick={startAdd}>
          New instruction
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-muted-foreground text-center"
              >
                No care instructions yet
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow
                key={item.id}
                className={cn(editingId === item.id && "bg-primary/5")}
              >
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.isActive === false ? "No" : "Yes"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant={editingId === item.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
