"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  addFabricMaster,
  deleteFabricMaster,
  updateFabricMaster,
  type FabricCompanyRate,
  type FabricMaster,
} from "@/lib/design-storage";
import { useDesignStore } from "@/lib/use-design-store";

export function DesignMastersManager() {
  const { store } = useDesignStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [width, setWidth] = useState("");
  const [weight, setWeight] = useState("");
  const [companies, setCompanies] = useState<FabricCompanyRate[]>([
    { companyName: "", rate: "" },
  ]);

  const items = store.masters.fabric;

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setWidth("");
    setWeight("");
    setCompanies([{ companyName: "", rate: "" }]);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Fabric name is required");
      return;
    }

    const payload: Omit<FabricMaster, "id"> = {
      name: trimmed,
      width,
      weight,
      companies,
    };

    if (editingId) {
      updateFabricMaster(editingId, payload);
      toast.success("Saved");
    } else {
      addFabricMaster(payload);
      toast.success("Added");
    }

    setDialogOpen(false);
    setEditingId(null);
  };

  const handleEdit = (item: FabricMaster) => {
    setEditingId(item.id);
    setName(item.name);
    setWidth(item.width);
    setWeight(item.weight);
    setCompanies(
      item.companies.length > 0
        ? item.companies
        : [{ companyName: "", rate: "" }],
    );
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this fabric?")) return;
    deleteFabricMaster(id);
    toast.success("Deleted");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openAdd}>
          Add fabric
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Width</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Companies</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground text-center"
              >
                No items yet
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.width || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.weight || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.companies.length}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit fabric" : "Add fabric"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a fabric stored in this browser.
            </DialogDescription>
          </DialogHeader>
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fabric-name">Fabric name</FieldLabel>
                <Input
                  id="fabric-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Cotton Poplin"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fabric-width">Width</FieldLabel>
                <Input
                  id="fabric-width"
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                  placeholder="e.g. 44 inch / 112 cm"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="fabric-weight">Weight</FieldLabel>
                <Input
                  id="fabric-weight"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="e.g. 120 gsm"
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Company rates</div>
                <div className="text-muted-foreground text-sm">
                  Store any company name with its rate for this fabric.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCompanies((prev) => [
                    ...prev,
                    { companyName: "", rate: "" },
                  ])
                }
              >
                Add company
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {companies.map((row, index) => (
                <Card key={`${index}-${row.companyName}`} className="p-0">
                  <CardContent className="grid gap-2 p-3 sm:grid-cols-5 sm:items-end">
                    <div className="sm:col-span-2">
                      <FieldLabel>Company name</FieldLabel>
                      <Input
                        value={row.companyName}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCompanies((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, companyName: value } : r,
                            ),
                          );
                        }}
                        placeholder="e.g. ABC Mills"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Rate</FieldLabel>
                      <Input
                        value={row.rate}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCompanies((prev) =>
                            prev.map((r, i) =>
                              i === index ? { ...r, rate: value } : r,
                            ),
                          );
                        }}
                        placeholder="e.g. 250 / meter"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCompanies((prev) =>
                            prev.length === 1
                              ? [{ companyName: "", rate: "" }]
                              : prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              {editingId ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
