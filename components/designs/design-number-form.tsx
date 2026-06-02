"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createId,
  deleteDesignNumber,
  emptyDesignEntry,
  fabricById,
  upsertDesignNumber,
  type DesignEntry,
  type FabricMaster,
  type DesignNumberRecord,
} from "@/lib/design-storage";
import { useDesignStore } from "@/lib/use-design-store";

function parseNumberList(input: string): number[] {
  if (!input.trim()) return [];
  const parts = input
    .split(/[,\s]+/g)
    .map((p) => p.trim())
    .filter(Boolean);
  const nums = parts.map((p) => Number(p)).filter((n) => Number.isFinite(n));
  return Array.from(new Set(nums));
}

function formatDesignSummary(
  design: DesignEntry,
  store: ReturnType<typeof useDesignStore>["store"],
) {
  const fabrics = design.fabricIds
    .map((id) => fabricById(store.masters.fabric, id))
    .filter(Boolean) as FabricMaster[];

  return { fabrics };
}

export function DesignNumberForm() {
  const { store } = useDesignStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [designs, setDesigns] = useState<DesignEntry[]>([emptyDesignEntry()]);
  const [stitchesInput, setStitchesInput] = useState<string[]>([""]);
  const [areasInput, setAreasInput] = useState<string[]>([""]);

  const resetForm = () => {
    setEditingId(null);
    setNumber("");
    setDesigns([emptyDesignEntry()]);
    setStitchesInput([""]);
    setAreasInput([""]);
  };

  const loadRecord = (record: DesignNumberRecord) => {
    setEditingId(record.id);
    setNumber(record.number);
    const nextDesigns =
      record.designs.length > 0
        ? record.designs.map((design) => ({ ...design }))
        : [emptyDesignEntry()];
    setDesigns(nextDesigns);
    setStitchesInput(nextDesigns.map((d) => d.stitches.join(", ")));
    setAreasInput(nextDesigns.map((d) => d.areas.join(", ")));
  };

  useEffect(() => {
    if (
      editingId &&
      !store.designNumbers.some((item) => item.id === editingId)
    ) {
      resetForm();
    }
  }, [editingId, store.designNumbers]);

  const updateDesign = (index: number, patch: Partial<DesignEntry>) => {
    setDesigns((current) =>
      current.map((design, i) =>
        i === index ? { ...design, ...patch } : design,
      ),
    );
  };

  const addDesign = () => {
    setDesigns((current) => [...current, emptyDesignEntry()]);
    setStitchesInput((prev) => [...prev, ""]);
    setAreasInput((prev) => [...prev, ""]);
  };

  const removeDesign = (index: number) => {
    setDesigns((current) => {
      if (current.length === 1) return current;
      return current.filter((_, i) => i !== index);
    });
    setStitchesInput((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
    setAreasInput((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const validate = () => {
    const trimmedNumber = number.trim();
    if (!trimmedNumber) {
      toast.error("Design number is required");
      return false;
    }

    for (let index = 0; index < designs.length; index += 1) {
      const design = designs[index];
      if (design.fabricIds.length === 0) {
        toast.error(`Design ${index + 1}: at least one fabric is required`);
        return false;
      }
    }

    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    upsertDesignNumber({
      id: editingId ?? createId(),
      number: number.trim(),
      designs: designs.map((design, index) => ({
        ...design,
        stitches: parseNumberList(stitchesInput[index] ?? ""),
        areas: parseNumberList(areasInput[index] ?? ""),
        fabricIds: [...design.fabricIds],
      })),
    });

    toast.success(editingId ? "Design number updated" : "Design number saved");
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this design number?")) return;
    deleteDesignNumber(id);
    if (editingId === id) resetForm();
    toast.success("Deleted");
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Edit design number" : "New design number"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="design-number">Design number</FieldLabel>
                <Input
                  id="design-number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="e.g. DN-1024"
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">Designs</h3>
                <p className="text-muted-foreground text-sm">
                  A single design number can contain multiple designs.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addDesign}>
                Add design
              </Button>
            </div>

            {designs.map((design, index) => (
              <Card key={design.id} className="border-dashed">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-base">
                    Design {index + 1}
                  </CardTitle>
                  {designs.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDesign(index)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field>
                    <FieldLabel>Stitches (numbers)</FieldLabel>
                    <Input
                      value={stitchesInput[index] ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStitchesInput((prev) =>
                          prev.map((v, i) => (i === index ? value : v)),
                        );
                        updateDesign(index, {
                          stitches: parseNumberList(value),
                        });
                      }}
                      placeholder="e.g. 12, 14, 18"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Areas (numbers)</FieldLabel>
                    <Input
                      value={areasInput[index] ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAreasInput((prev) =>
                          prev.map((v, i) => (i === index ? value : v)),
                        );
                        updateDesign(index, { areas: parseNumberList(value) });
                      }}
                      placeholder="e.g. 120, 150"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Fabrics</FieldLabel>
                    {store.masters.fabric.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No fabrics yet — add them in the Masters tab.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {store.masters.fabric.map((fabric) => (
                          <label
                            key={fabric.id}
                            className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2"
                          >
                            <Checkbox
                              checked={design.fabricIds.includes(fabric.id)}
                              onCheckedChange={(checked) => {
                                const next =
                                  checked === true
                                    ? [...design.fabricIds, fabric.id]
                                    : design.fabricIds.filter(
                                        (id) => id !== fabric.id,
                                      );
                                updateDesign(index, { fabricIds: next });
                              }}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {fabric.name}
                              </span>
                              <span className="text-muted-foreground block truncate text-xs">
                                {fabric.width || "—"} • {fabric.weight || "—"} •{" "}
                                {fabric.companies?.length ?? 0} companies
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </Field>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave}>
              {editingId ? "Save changes" : "Save design number"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Saved design numbers</h2>
          <p className="text-muted-foreground text-sm">
            Stored in this browser&apos;s localStorage.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Design number</TableHead>
              <TableHead>Designs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {store.designNumbers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground text-center"
                >
                  No design numbers yet
                </TableCell>
              </TableRow>
            ) : (
              store.designNumbers.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.number}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      {record.designs.map((design, index) => {
                        const summary = formatDesignSummary(design, store);
                        return (
                          <div
                            key={design.id}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            <div className="mb-1 font-medium">
                              Design {index + 1}
                            </div>
                            <div className="text-muted-foreground flex flex-wrap gap-1">
                              {design.stitches.length > 0 ? (
                                <Badge variant="outline">
                                  Stitches: {design.stitches.join(", ")}
                                </Badge>
                              ) : null}
                              {design.areas.length > 0 ? (
                                <Badge variant="outline">
                                  Areas: {design.areas.join(", ")}
                                </Badge>
                              ) : null}
                              {summary.fabrics.map((fabric) => (
                                <Badge key={fabric.id} variant="secondary">
                                  Fabric: {fabric.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => loadRecord(record)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
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
    </div>
  );
}
