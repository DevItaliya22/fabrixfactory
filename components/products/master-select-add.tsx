"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type Option = { id: string; label: string };

type MasterSelectAddProps = {
  label: string;
  placeholder?: string;
  value?: string;
  onValueChange: (id: string) => void;
  options: Option[];
  popoverTitle: string;
  adding?: boolean;
  onConfirmAdd: () => void | Promise<void>;
  children: React.ReactNode;
  /** Reset dropdown after pick — useful when selecting adds to a list */
  clearOnSelect?: boolean;
  emptyMessage?: string;
};

export function MasterSelectAdd({
  label,
  placeholder = "Select…",
  value,
  onValueChange,
  options,
  popoverTitle,
  adding,
  onConfirmAdd,
  children,
  clearOnSelect,
  emptyMessage = "Nothing yet — use + to add",
}: MasterSelectAddProps) {
  const [open, setOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const handleSelect = (id: string) => {
    onValueChange(id);
    if (clearOnSelect) setPickerKey((k) => k + 1);
  };

  const handleConfirm = async () => {
    await onConfirmAdd();
    setOpen(false);
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 px-3"
              aria-label={`Add ${label}`}
            >
              +
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <PopoverHeader>
              <PopoverTitle>{popoverTitle}</PopoverTitle>
            </PopoverHeader>
            <div className="flex flex-col gap-3">{children}</div>
            <Button
              type="button"
              className="w-full"
              disabled={adding}
              onClick={handleConfirm}
            >
              {adding ? (
                <>
                  <Spinner /> Adding…
                </>
              ) : (
                "Add"
              )}
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  );
}
