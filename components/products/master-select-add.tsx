"use client";

import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  buildMasterPayload,
  defaultMasterForm,
  MasterFormFields,
  type CollectionOption,
  validateMasterForm,
} from "@/components/masters/master-form-fields";
import type { MasterType } from "@/lib/masters-config";

type Option = { id: string; label: string };

type MasterSelectAddProps = {
  label: string;
  placeholder?: string;
  value?: string;
  onValueChange: (id: string) => void;
  options: Option[];
  masterType: MasterType;
  dialogTitle: string;
  adding?: boolean;
  onConfirmAdd: (payload: Record<string, unknown>) => void | Promise<void>;
  collections?: CollectionOption[];
  clearOnSelect?: boolean;
  emptyMessage?: string;
};

export function MasterSelectAdd({
  label,
  placeholder = "Select…",
  value,
  onValueChange,
  options,
  masterType,
  dialogTitle,
  adding,
  onConfirmAdd,
  collections = [],
  clearOnSelect,
  emptyMessage = "Nothing yet — use + to add",
}: MasterSelectAddProps) {
  const [open, setOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(() =>
    defaultMasterForm(masterType),
  );

  const handleSelect = (id: string) => {
    onValueChange(id);
    if (clearOnSelect) setPickerKey((k) => k + 1);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setForm(defaultMasterForm(masterType));
    }
  };

  const handleConfirm = async () => {
    const error = validateMasterForm(masterType, form);
    if (error) {
      toast.error(error);
      return;
    }
    const payload = buildMasterPayload(masterType, form);
    await onConfirmAdd(payload);
    setOpen(false);
    setForm(defaultMasterForm(masterType));
  };

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2">
        <Select
          key={pickerKey}
          value={clearOnSelect ? undefined : value}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                {emptyMessage}
              </div>
            ) : (
              options.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="shrink-0 px-3"
          aria-label={`Add ${label}`}
          onClick={() => handleOpenChange(true)}
        >
          +
        </Button>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription className="sr-only">
                Create a new {label.toLowerCase()} entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <MasterFormFields
                type={masterType}
                form={form}
                onChange={setForm}
                collections={collections}
                showActiveToggle={false}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={adding} onClick={handleConfirm}>
                {adding ? (
                  <>
                    <Spinner /> Adding…
                  </>
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Field>
  );
}
