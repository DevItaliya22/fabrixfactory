"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { formatCollectionLabel } from "@/lib/collections";
import type { MasterType } from "@/lib/masters-config";

export const PARENT_NONE = "__none__";

export type CollectionOption = {
  id: string;
  name: string;
  parent?: { name: string } | null;
};

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

export function str(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function defaultMasterForm(type: MasterType): Record<string, string> {
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

export function buildMasterPayload(
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

export function validateMasterForm(
  type: MasterType,
  form: Record<string, string>,
): string | null {
  switch (type) {
    case "colour":
    case "fabric":
    case "tag":
    case "collection":
      if (!form.name?.trim()) return "Name is required";
      break;
    case "width":
      if (!form.label?.trim()) return "Label is required";
      break;
    case "care":
      if (!form.title?.trim()) return "Title is required";
      break;
    case "lengthPreset":
      if (!form.value || Number.isNaN(parseFloat(form.value))) {
        return "Valid length value is required";
      }
      break;
  }
  return null;
}

type MasterFormFieldsProps = {
  type: MasterType;
  form: Record<string, string>;
  onChange: (form: Record<string, string>) => void;
  collections?: CollectionOption[];
  excludeCollectionId?: string;
  showActiveToggle?: boolean;
};

export function MasterFormFields({
  type,
  form,
  onChange,
  collections = [],
  excludeCollectionId,
  showActiveToggle = true,
}: MasterFormFieldsProps) {
  const set = (patch: Record<string, string>) =>
    onChange({ ...form, ...patch });

  const activeField = showActiveToggle ? (
    <div className="flex items-center gap-3 pt-1">
      <Switch
        id="master-active"
        checked={form.isActive !== "false"}
        onCheckedChange={(checked) =>
          set({ isActive: checked ? "true" : "false" })
        }
      />
      <Label htmlFor="master-active">Active</Label>
    </div>
  ) : null;

  const parentOptions = collections.filter(
    (c) => !excludeCollectionId || c.id !== excludeCollectionId,
  );

  switch (type) {
    case "colour":
      return (
        <>
          <Field label="Name">
            <Input
              value={form.name ?? ""}
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <Field label="Colour">
            <ColorPicker
              value={form.hexCode ?? "#cccccc"}
              onChange={(hex) => set({ hexCode: hex })}
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
              onChange={(e) => set({ label: e.target.value })}
            />
          </Field>
          <Field label="cm (optional)">
            <Input
              value={form.valueInCm ?? ""}
              onChange={(e) => set({ valueInCm: e.target.value })}
              inputMode="decimal"
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
              onChange={(e) => set({ name: e.target.value })}
            />
          </Field>
          <Field label="Description (optional)">
            <Input
              value={form.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
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
              onChange={(e) => set({ name: e.target.value })}
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
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Summer fabrics"
            />
          </Field>
          <Field label="Parent collection (optional)">
            <Select
              value={form.parentId ?? PARENT_NONE}
              onValueChange={(v) => set({ parentId: v })}
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
              onChange={(e) => set({ description: e.target.value })}
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
              onChange={(e) => set({ title: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
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
              onChange={(e) => set({ label: e.target.value })}
            />
          </Field>
          <Field label="Value">
            <Input
              value={form.value ?? ""}
              onChange={(e) => set({ value: e.target.value })}
              inputMode="decimal"
            />
          </Field>
          <Field label="Unit">
            <Select
              value={form.unit ?? "METRE"}
              onValueChange={(v) => set({ unit: v })}
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
}
