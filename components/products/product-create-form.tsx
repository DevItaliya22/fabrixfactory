"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { MasterSelectAdd } from "@/components/products/master-select-add";
import {
  formatProductUrl,
  getCollectionPathNames,
  getCollectionPathSlugs,
  type CollectionNode,
} from "@/lib/collections";
import { slugify } from "@/lib/format";
import {
  formatSlugConflictMessage,
  isInvalidDecimalInput,
  parseNonNegativeDecimal,
  validateRateTiers,
  type RateTierRow,
} from "@/lib/product-form-validation";
import type { SlugConflict } from "@/lib/products";

type FormOptions = {
  widths: { id: string; label: string; valueInCm?: string | null }[];
  colours: { id: string; name: string; hexCode: string | null }[];
  fabrics: { id: string; name: string }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    parent: { name: string } | null;
  }[];
  tags: { id: string; name: string }[];
  lengthPresets: {
    id: string;
    label: string | null;
    value: string;
    unit: string;
  }[];
  careInstructions: {
    id: string;
    title: string;
    description: string | null;
  }[];
};

type ImageRow = {
  id: string;
  url?: string;
  key?: string;
  preview?: string;
  file?: File;
  uploading?: boolean;
  altText?: string;
};

async function uploadFileToR2(
  file: File,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return { url: data.url, key: data.key };
}

async function resolveImageRows(rows: ImageRow[]): Promise<ImageRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      if (!row.file || row.url) return row;
      const { url, key } = await uploadFileToR2(row.file);
      if (row.preview?.startsWith("blob:")) {
        URL.revokeObjectURL(row.preview);
      }
      return {
        ...row,
        url,
        key,
        file: undefined,
        preview: undefined,
        uploading: false,
      };
    }),
  );
}

function collectAllImages(
  colourImages: Record<string, ImageRow[]>,
  generalImages: ImageRow[],
  selectedColours: string[],
  productName: string,
): {
  url: string;
  key?: string;
  colourId?: string;
  altText?: string;
  isPrimary?: boolean;
}[] {
  const result: {
    url: string;
    key?: string;
    colourId?: string;
    altText?: string;
    isPrimary?: boolean;
  }[] = [];
  let primarySet = false;

  for (const colourId of selectedColours) {
    const rows = colourImages[colourId] ?? [];
    for (const img of rows.filter((r) => r.url)) {
      const isPrimary = !primarySet && img.id === rows.find((r) => r.url)?.id;
      if (isPrimary) primarySet = true;
      result.push({
        url: img.url!,
        key: img.key,
        colourId,
        altText: img.altText || productName,
        isPrimary,
      });
    }
  }

  for (const img of generalImages.filter((r) => r.url)) {
    result.push({
      url: img.url!,
      key: img.key,
      altText: img.altText || productName,
      isPrimary: !primarySet,
    });
    if (!primarySet) primarySet = true;
  }

  return result;
}

type LengthRow = {
  id: string;
  lengthPresetId?: string;
  customValue: string;
  customUnit: string;
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyImageRow(): ImageRow {
  return { id: newId() };
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function ProductCreateForm({ productId }: { productId?: string } = {}) {
  const router = useRouter();
  const isEdit = Boolean(productId);
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "images" | "saving">(
    "idle",
  );

  // Basic
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [description, setDescription] = useState("");

  // Attributes
  const [widthId, setWidthId] = useState<string>();
  const [fabricId, setFabricId] = useState<string>();
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<string>();
  const [stockStatus, setStockStatus] = useState("IN_STOCK");
  const [status, setStatus] = useState("DRAFT");

  // Offer
  const [isOnOffer, setIsOnOffer] = useState(false);
  const [offerType, setOfferType] = useState<string>("PERCENTAGE");
  const [offerPercent, setOfferPercent] = useState("");
  const [offerFixedPrice, setOfferFixedPrice] = useState("");

  // Lead time
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [leadTimeDate, setLeadTimeDate] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");

  // Relations
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [defaultColourId, setDefaultColourId] = useState<string>();
  const [colourImages, setColourImages] = useState<Record<string, ImageRow[]>>(
    {},
  );
  const [generalImages, setGeneralImages] = useState<ImageRow[]>([
    emptyImageRow(),
  ]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedCare, setSelectedCare] = useState<string[]>([]);
  const [slugConflicts, setSlugConflicts] = useState<SlugConflict[]>([]);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [tierErrors, setTierErrors] = useState<Record<string, string>>({});

  const [rateTiers, setRateTiers] = useState<RateTierRow[]>([
    {
      id: newId(),
      minQuantity: "0",
      maxQuantity: "",
      originalRate: "",
      discountedRate: "",
      shippingCharge: "",
    },
  ]);
  const [availableLengths, setAvailableLengths] = useState<LengthRow[]>([]);

  const [addingMaster, setAddingMaster] = useState<string | null>(null);

  const loadOptions = useCallback(async () => {
    const res = await fetch("/api/products/options");
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setOptions(data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/products/options")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setOptions(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load form options");
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!productId || !options) return;

    let cancelled = false;

    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const p = data.product;

        setName(p.name ?? "");
        setSlug(p.slug ?? "");
        setSkuCode(p.skuCode ?? "");
        setDescription(p.description ?? "");
        setWidthId(p.widthId ?? undefined);
        setFabricId(p.fabricCompositionId ?? undefined);
        setWeightValue(p.weightValue != null ? String(p.weightValue) : "");
        setWeightUnit(p.weightUnit ?? undefined);
        setStockStatus(p.stockStatus ?? "IN_STOCK");
        setStatus(p.status ?? "DRAFT");
        setIsOnOffer(p.isOnOffer ?? false);
        setOfferType(p.offerType ?? "PERCENTAGE");
        setOfferPercent(p.offerPercent != null ? String(p.offerPercent) : "");
        setOfferFixedPrice(
          p.offerFixedPrice != null ? String(p.offerFixedPrice) : "",
        );
        setLeadTimeDays(p.leadTimeDays != null ? String(p.leadTimeDays) : "");
        setLeadTimeDate(toDateInput(p.leadTimeDate));
        setAvailabilityDate(toDateInput(p.availabilityDate));

        const colours = (p.productColours ?? []).map(
          (pc: { colourId: string }) => pc.colourId,
        );
        setSelectedColours(colours);
        const defaultPc = (p.productColours ?? []).find(
          (pc: { isDefault: boolean }) => pc.isDefault,
        );
        setDefaultColourId(defaultPc?.colourId ?? colours[0]);

        const byColour: Record<string, ImageRow[]> = {};
        const general: ImageRow[] = [];
        for (const img of p.productImages ?? []) {
          const row: ImageRow = {
            id: newId(),
            url: img.url,
            altText: img.altText ?? undefined,
            key: (img.extraInfo as { r2Key?: string } | null)?.r2Key,
          };
          if (img.colourId) {
            if (!byColour[img.colourId]) byColour[img.colourId] = [];
            byColour[img.colourId].push(row);
          } else {
            general.push(row);
          }
        }
        setColourImages(byColour);
        setGeneralImages(general.length ? general : [emptyImageRow()]);

        setRateTiers(
          (p.productRateTiers ?? []).length
            ? (p.productRateTiers ?? []).map(
                (t: {
                  minQuantity: number;
                  maxQuantity: number | null;
                  originalRate: number;
                  discountedRate: number | null;
                  shippingCharge: number | null;
                }) => ({
                  id: newId(),
                  minQuantity: String(t.minQuantity),
                  maxQuantity:
                    t.maxQuantity != null ? String(t.maxQuantity) : "",
                  originalRate: String(t.originalRate),
                  discountedRate:
                    t.discountedRate != null ? String(t.discountedRate) : "",
                  shippingCharge:
                    t.shippingCharge != null ? String(t.shippingCharge) : "",
                }),
              )
            : [
                {
                  id: newId(),
                  minQuantity: "0",
                  maxQuantity: "",
                  originalRate: "",
                  discountedRate: "",
                  shippingCharge: "",
                },
              ],
        );

        setAvailableLengths(
          (p.productAvailableLengths ?? []).map(
            (l: {
              lengthPresetId: string | null;
              customValue: number | null;
              customUnit: string | null;
            }) => ({
              id: newId(),
              lengthPresetId: l.lengthPresetId ?? undefined,
              customValue: l.customValue != null ? String(l.customValue) : "",
              customUnit: l.customUnit ?? "METRE",
            }),
          ),
        );

        setSelectedCare(
          (p.productCareInstructions ?? []).map(
            (c: { careInstructionId: string }) => c.careInstructionId,
          ),
        );
        setSelectedCollections(
          (p.productCollections ?? []).map(
            (c: { collectionId: string }) => c.collectionId,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load product");
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, options]);

  const collectionNodes: CollectionNode[] = useMemo(
    () => options?.collections ?? [],
    [options?.collections],
  );

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      const trimmed = slug.trim();
      if (!trimmed || selectedCollections.length === 0) {
        if (!cancelled) setSlugConflicts([]);
        return;
      }

      setCheckingSlug(true);
      try {
        const params = new URLSearchParams({
          slug: trimmed,
          collectionIds: selectedCollections.join(","),
        });
        if (productId) params.set("excludeProductId", productId);
        const res = await fetch(`/api/products/check-slug?${params}`);
        const data = await res.json();
        if (!cancelled) setSlugConflicts(data.conflicts ?? []);
      } catch {
        if (!cancelled) setSlugConflicts([]);
      } finally {
        if (!cancelled) setCheckingSlug(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, selectedCollections, productId]);

  const createMaster = async (
    type: string,
    payload: Record<string, unknown>,
    onSuccess?: (item: { id: string }) => void,
  ) => {
    setAddingMaster(type);
    try {
      const res = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      await loadOptions();
      onSuccess?.(data.item);
      toast.success("Added");
      return data.item;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAddingMaster(null);
    }
  };

  const handleNameBlur = () => {
    if (!slug && name) setSlug(slugify(name));
  };

  const stageImage = (
    file: File,
    rowId: string,
    setter: React.Dispatch<React.SetStateAction<ImageRow[]>>,
  ) => {
    setter((prev) =>
      prev.map((img) => {
        if (img.id !== rowId) return img;
        if (img.preview?.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
        return {
          ...img,
          file,
          preview: URL.createObjectURL(file),
          url: undefined,
          key: undefined,
        };
      }),
    );
  };

  const removeImage = async (
    row: ImageRow,
    setter: React.Dispatch<React.SetStateAction<ImageRow[]>>,
  ) => {
    if (row.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(row.preview);
    }
    if (row.key) {
      try {
        await fetch(`/api/upload?key=${encodeURIComponent(row.key)}`, {
          method: "DELETE",
        });
      } catch {
        /* ignore */
      }
    }
    setter((prev) => prev.filter((img) => img.id !== row.id));
  };

  const toggleColour = (colourId: string) => {
    setSelectedColours((prev) => {
      const next = prev.includes(colourId)
        ? prev.filter((id) => id !== colourId)
        : [...prev, colourId];

      if (!prev.includes(colourId)) {
        setColourImages((imgs) => ({
          ...imgs,
          [colourId]: imgs[colourId] ?? [emptyImageRow()],
        }));
        if (!defaultColourId) setDefaultColourId(colourId);
      } else {
        if (defaultColourId === colourId) {
          setDefaultColourId(next[0]);
        }
        setColourImages((imgs) => {
          const copy = { ...imgs };
          delete copy[colourId];
          return copy;
        });
      }
      return next;
    });
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setSkuCode("");
    setDescription("");
    setWidthId(undefined);
    setFabricId(undefined);
    setWeightValue("");
    setWeightUnit(undefined);
    setStockStatus("IN_STOCK");
    setStatus("DRAFT");
    setIsOnOffer(false);
    setOfferPercent("");
    setOfferFixedPrice("");
    setLeadTimeDays("");
    setLeadTimeDate("");
    setAvailabilityDate("");
    setSelectedColours([]);
    setDefaultColourId(undefined);
    setColourImages({});
    setGeneralImages([emptyImageRow()]);
    setSelectedCollections([]);
    setSelectedCare([]);
    setSlugConflicts([]);
    setAvailableLengths([]);
    setRateTiers([
      {
        id: newId(),
        minQuantity: "0",
        maxQuantity: "",
        originalRate: "",
        discountedRate: "",
        shippingCharge: "",
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (slugConflicts.length > 0) {
      toast.error(formatSlugConflictMessage(slugConflicts));
      return;
    }

    const tierValidation = validateRateTiers(rateTiers);
    setTierErrors(tierValidation);
    if (Object.keys(tierValidation).length > 0) {
      toast.error("Fix pricing tier errors before saving");
      return;
    }

    if (
      isOnOffer &&
      offerType === "PERCENTAGE" &&
      offerPercent &&
      isInvalidDecimalInput(offerPercent)
    ) {
      toast.error("Offer % must be zero or greater");
      return;
    }

    if (
      isOnOffer &&
      offerType === "FIXED_PRICE" &&
      offerFixedPrice &&
      isInvalidDecimalInput(offerFixedPrice)
    ) {
      toast.error("Offer price must be zero or greater");
      return;
    }

    setSubmitting(true);
    setSubmitPhase("images");
    try {
      const resolvedGeneral = await resolveImageRows(generalImages);
      const resolvedColour: Record<string, ImageRow[]> = {};
      for (const colourId of selectedColours) {
        resolvedColour[colourId] = await resolveImageRows(
          colourImages[colourId] ?? [],
        );
      }
      setGeneralImages(resolvedGeneral);
      setColourImages((prev) => ({ ...prev, ...resolvedColour }));

      setSubmitPhase("saving");
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        skuCode: skuCode.trim() || undefined,
        description: description.trim() || undefined,
        widthId: widthId || undefined,
        fabricCompositionId: fabricId || undefined,
        weightValue: weightValue ? parseFloat(weightValue) : undefined,
        weightUnit: weightUnit || undefined,
        stockStatus,
        status,
        isOnOffer,
        offerType: isOnOffer ? offerType : undefined,
        offerPercent:
          isOnOffer && offerType === "PERCENTAGE" && offerPercent
            ? parseFloat(offerPercent)
            : undefined,
        offerFixedPrice:
          isOnOffer && offerType === "FIXED_PRICE" && offerFixedPrice
            ? parseFloat(offerFixedPrice)
            : undefined,
        leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
        leadTimeDate: leadTimeDate || undefined,
        availabilityDate: availabilityDate || undefined,
        colours: selectedColours.map((colourId) => ({
          colourId,
          isDefault: colourId === defaultColourId,
        })),
        images: collectAllImages(
          resolvedColour,
          resolvedGeneral,
          selectedColours,
          name.trim(),
        ),
        rateTiers: rateTiers
          .filter((t) => t.originalRate.trim())
          .map((t) => ({
            minQuantity: parseNonNegativeDecimal(t.minQuantity) ?? 0,
            maxQuantity: t.maxQuantity.trim()
              ? (parseNonNegativeDecimal(t.maxQuantity) ?? undefined)
              : undefined,
            originalRate: parseNonNegativeDecimal(t.originalRate)!,
            discountedRate: t.discountedRate.trim()
              ? (parseNonNegativeDecimal(t.discountedRate) ?? undefined)
              : undefined,
            shippingCharge: t.shippingCharge.trim()
              ? (parseNonNegativeDecimal(t.shippingCharge) ?? undefined)
              : undefined,
          })),
        availableLengths: availableLengths
          .filter((l) => l.lengthPresetId || l.customValue)
          .map((l) => ({
            lengthPresetId: l.lengthPresetId || undefined,
            customValue: l.customValue ? parseFloat(l.customValue) : undefined,
            customUnit: l.customValue ? l.customUnit : undefined,
          })),
        careInstructionIds: selectedCare,
        collectionIds: selectedCollections,
        tagIds: [],
      };

      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            (isEdit ? "Failed to update product" : "Failed to create product"),
        );
      }

      toast.success(
        isEdit
          ? `Product "${data.product.name}" updated`
          : `Product "${data.product.name}" created`,
      );

      if (isEdit) {
        router.push("/products");
      } else {
        resetForm();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
      setSubmitPhase("idle");
    }
  };

  if (loadingOptions || loadingProduct) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Spinner />
        Loading form…
      </div>
    );
  }

  const colours = options?.colours ?? [];
  const collections = collectionNodes;

  const submitLabel =
    submitPhase === "images"
      ? "Uploading images…"
      : submitPhase === "saving"
        ? isEdit
          ? "Saving…"
          : "Creating…"
        : isEdit
          ? "Save changes"
          : "Create product";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-6xl space-y-8 p-6 pb-28"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit product" : "Create product"}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {isEdit
            ? "Update details in order — images upload when you save."
            : "Follow each section top to bottom. Images stay on your device until you create the product."}
        </p>
      </div>

      <FormSection step={1} title="Product details">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Product name *</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="slug">URL slug</FieldLabel>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-from-name"
              />
              {selectedCollections.length > 0 && slug.trim() ? (
                <div className="mt-2 space-y-1">
                  {selectedCollections.map((collectionId) => {
                    const pathSlugs = getCollectionPathSlugs(
                      collectionId,
                      collectionNodes,
                    );
                    return (
                      <p
                        key={collectionId}
                        className="text-muted-foreground font-mono text-xs"
                      >
                        /{formatProductUrl(pathSlugs, slug.trim())}
                      </p>
                    );
                  })}
                </div>
              ) : null}
              {checkingSlug ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Checking slug…
                </p>
              ) : null}
              {slugConflicts.length > 0 ? (
                <p className="text-destructive mt-1 text-xs">
                  {formatSlugConflictMessage(slugConflicts)}
                </p>
              ) : null}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sku">SKU code</FieldLabel>
              <Input
                id="sku"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel>Publish status</FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <RichTextEditor
              id="description"
              value={description}
              onChange={setDescription}
              placeholder="Fabric feel, use cases, key selling points…"
            />
          </Field>

          <FieldSet>
            <MasterSelectAdd
              label="Collection"
              placeholder="Select collection to add"
              masterType="collection"
              dialogTitle="New collection"
              clearOnSelect
              collections={collections}
              onValueChange={(id) => {
                if (!selectedCollections.includes(id)) {
                  setSelectedCollections((prev) => [...prev, id]);
                }
              }}
              options={collections
                .filter((c) => !selectedCollections.includes(c.id))
                .map((c) => ({
                  id: c.id,
                  label: getCollectionPathNames(c.id, collectionNodes).join(
                    " › ",
                  ),
                }))}
              adding={addingMaster === "collection"}
              onConfirmAdd={(payload) =>
                createMaster("collection", payload, (item) => {
                  setSelectedCollections((prev) => [...prev, item.id]);
                })
              }
              emptyMessage="All collections selected or none yet"
            />
            {selectedCollections.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCollections.map((id) => {
                  const col = collections.find((c) => c.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-2 py-1 pr-1 pl-2"
                    >
                      {col
                        ? getCollectionPathNames(id, collectionNodes).join(
                            " › ",
                          )
                        : id}
                      <button
                        type="button"
                        className="hover:bg-muted rounded px-1 text-xs"
                        onClick={() =>
                          setSelectedCollections((prev) =>
                            prev.filter((x) => x !== id),
                          )
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </FieldSet>
        </FieldGroup>
      </FormSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection step={2} title="Material & inventory">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <MasterSelectAdd
                label="Width"
                placeholder="Select width"
                masterType="width"
                dialogTitle="New width"
                value={widthId}
                onValueChange={setWidthId}
                options={
                  options?.widths.map((w) => ({
                    id: w.id,
                    label: w.label,
                  })) ?? []
                }
                adding={addingMaster === "width"}
                onConfirmAdd={(payload) =>
                  createMaster("width", payload, (item) => setWidthId(item.id))
                }
              />

              <MasterSelectAdd
                label="Fabric composition"
                placeholder="Select fabric"
                masterType="fabric"
                dialogTitle="New fabric"
                value={fabricId}
                onValueChange={setFabricId}
                options={
                  options?.fabrics.map((f) => ({
                    id: f.id,
                    label: f.name,
                  })) ?? []
                }
                adding={addingMaster === "fabric"}
                onConfirmAdd={(payload) =>
                  createMaster("fabric", payload, (item) =>
                    setFabricId(item.id),
                  )
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="weight">Weight</FieldLabel>
                <Input
                  id="weight"
                  type="number"
                  step="0.001"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Weight unit</FieldLabel>
                <Select value={weightUnit} onValueChange={setWeightUnit}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="METRE">Per metre</SelectItem>
                    <SelectItem value="PIECE">Per piece</SelectItem>
                    <SelectItem value="YARD">Per yard</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Stock status</FieldLabel>
                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_STOCK">In stock</SelectItem>
                    <SelectItem value="LOW_STOCK">Low stock</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                    <SelectItem value="PRE_ORDER">Pre-order</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </FieldGroup>
        </FormSection>

        <FormSection step={3} title="Colour variants">
          <MasterSelectAdd
            label="Colour"
            placeholder="Select colour to add"
            masterType="colour"
            dialogTitle="New colour"
            clearOnSelect
            onValueChange={(id) => {
              if (!selectedColours.includes(id)) toggleColour(id);
            }}
            options={colours
              .filter((c) => !selectedColours.includes(c.id))
              .map((c) => ({ id: c.id, label: c.name }))}
            adding={addingMaster === "colour"}
            onConfirmAdd={(payload) =>
              createMaster("colour", payload, (item) => {
                if (!selectedColours.includes(item.id)) toggleColour(item.id);
              })
            }
            emptyMessage="All colours selected or none yet"
          />

          {selectedColours.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {selectedColours.map((id) => {
                  const c = colours.find((x) => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-2 py-1 pr-1 pl-2"
                    >
                      {c?.hexCode && (
                        <span
                          className="size-3 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: c.hexCode }}
                        />
                      )}
                      {c?.name}
                      <button
                        type="button"
                        className="hover:bg-muted rounded px-1 text-xs"
                        onClick={() => toggleColour(id)}
                        aria-label={`Remove ${c?.name}`}
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <Field>
                <FieldLabel>Default colour</FieldLabel>
                <RadioGroup
                  value={defaultColourId}
                  onValueChange={setDefaultColourId}
                  className="flex flex-wrap gap-3"
                >
                  {selectedColours.map((id) => {
                    const c = colours.find((x) => x.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <RadioGroupItem value={id} id={`default-${id}`} />
                        <Label htmlFor={`default-${id}`}>{c?.name}</Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </Field>
            </>
          )}
        </FormSection>
      </div>

      <FormSection step={4} title="Product images">
        <div className="space-y-8">
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Main gallery</h3>
            <ImageUploadList
              rows={generalImages}
              onChange={setGeneralImages}
              stageImage={stageImage}
              removeImage={removeImage}
            />
          </div>

          {selectedColours.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold">Images per colour</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedColours.map((colourId) => {
                  const colour = colours.find((c) => c.id === colourId);
                  const rows = colourImages[colourId] ?? [emptyImageRow()];
                  return (
                    <div
                      key={colourId}
                      className="space-y-3 rounded-xl border p-4"
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {colour?.hexCode ? (
                          <span
                            className="size-4 rounded-full ring-1 ring-border"
                            style={{ backgroundColor: colour.hexCode }}
                          />
                        ) : null}
                        {colour?.name}
                      </div>
                      <ImageUploadList
                        rows={rows}
                        onChange={(next) =>
                          setColourImages((prev) => ({
                            ...prev,
                            [colourId]:
                              typeof next === "function"
                                ? next(prev[colourId] ?? [])
                                : next,
                          }))
                        }
                        stageImage={stageImage}
                        removeImage={removeImage}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </FormSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection step={5} title="Pricing">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold">Rate tiers</h3>
              {rateTiers.map((tier) => (
                <div key={tier.id} className="space-y-3 rounded-xl border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Min QTY</FieldLabel>
                      <Input
                        inputMode="decimal"
                        placeholder="0"
                        value={tier.minQuantity}
                        onChange={(e) => {
                          setRateTiers((prev) =>
                            prev.map((t) =>
                              t.id === tier.id
                                ? { ...t, minQuantity: e.target.value }
                                : t,
                            ),
                          );
                          setTierErrors((prev) => {
                            const next = { ...prev };
                            delete next[tier.id];
                            return next;
                          });
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Max QTY</FieldLabel>
                      <Input
                        inputMode="decimal"
                        placeholder="∞"
                        value={tier.maxQuantity}
                        onChange={(e) => {
                          setRateTiers((prev) =>
                            prev.map((t) =>
                              t.id === tier.id
                                ? { ...t, maxQuantity: e.target.value }
                                : t,
                            ),
                          );
                          setTierErrors((prev) => {
                            const next = { ...prev };
                            delete next[tier.id];
                            return next;
                          });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field>
                      <FieldLabel>Original</FieldLabel>
                      <Input
                        inputMode="decimal"
                        value={tier.originalRate}
                        onChange={(e) => {
                          setRateTiers((prev) =>
                            prev.map((t) =>
                              t.id === tier.id
                                ? { ...t, originalRate: e.target.value }
                                : t,
                            ),
                          );
                          setTierErrors((prev) => {
                            const next = { ...prev };
                            delete next[tier.id];
                            return next;
                          });
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Discounted</FieldLabel>
                      <Input
                        inputMode="decimal"
                        value={tier.discountedRate}
                        onChange={(e) => {
                          setRateTiers((prev) =>
                            prev.map((t) =>
                              t.id === tier.id
                                ? { ...t, discountedRate: e.target.value }
                                : t,
                            ),
                          );
                          setTierErrors((prev) => {
                            const next = { ...prev };
                            delete next[tier.id];
                            return next;
                          });
                        }}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Shipping</FieldLabel>
                      <Input
                        inputMode="decimal"
                        value={tier.shippingCharge}
                        onChange={(e) => {
                          setRateTiers((prev) =>
                            prev.map((t) =>
                              t.id === tier.id
                                ? { ...t, shippingCharge: e.target.value }
                                : t,
                            ),
                          );
                          setTierErrors((prev) => {
                            const next = { ...prev };
                            delete next[tier.id];
                            return next;
                          });
                        }}
                      />
                    </Field>
                  </div>
                  {tierErrors[tier.id] ? (
                    <p className="text-destructive text-xs">
                      {tierErrors[tier.id]}
                    </p>
                  ) : null}
                  {rateTiers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRateTiers((prev) =>
                          prev.filter((t) => t.id !== tier.id),
                        )
                      }
                    >
                      Remove tier
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setRateTiers((prev) => [
                    ...prev,
                    {
                      id: newId(),
                      minQuantity: "",
                      maxQuantity: "",
                      originalRate: "",
                      discountedRate: "",
                      shippingCharge: "",
                    },
                  ])
                }
              >
                Add rate tier
              </Button>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-bold">Promotional offer</h3>
              <div className="flex items-center gap-3">
                <Switch
                  checked={isOnOffer}
                  onCheckedChange={setIsOnOffer}
                  id="on-offer"
                />
                <Label htmlFor="on-offer">Product is on offer</Label>
              </div>
              {isOnOffer ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Offer type</FieldLabel>
                    <Select value={offerType} onValueChange={setOfferType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">
                          Percentage off
                        </SelectItem>
                        <SelectItem value="FIXED_PRICE">
                          Fixed offer price
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {offerType === "PERCENTAGE" ? (
                    <Field>
                      <FieldLabel>Offer %</FieldLabel>
                      <Input
                        inputMode="decimal"
                        value={offerPercent}
                        onChange={(e) => setOfferPercent(e.target.value)}
                        placeholder="15"
                      />
                    </Field>
                  ) : (
                    <Field>
                      <FieldLabel>Offer price</FieldLabel>
                      <Input
                        inputMode="decimal"
                        value={offerFixedPrice}
                        onChange={(e) => setOfferFixedPrice(e.target.value)}
                      />
                    </Field>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </FormSection>

        <FormSection step={6} title="Available lengths">
          <div className="space-y-4">
            <MasterSelectAdd
              label="Length preset"
              placeholder="Select preset to add row"
              masterType="lengthPreset"
              dialogTitle="New length preset"
              clearOnSelect
              onValueChange={(id) => {
                setAvailableLengths((prev) => [
                  ...prev,
                  {
                    id: newId(),
                    lengthPresetId: id,
                    customValue: "",
                    customUnit: "METRE",
                  },
                ]);
              }}
              options={
                options?.lengthPresets.map((p) => ({
                  id: p.id,
                  label: p.label ?? `${p.value} ${p.unit}`,
                })) ?? []
              }
              adding={addingMaster === "lengthPreset"}
              onConfirmAdd={(payload) => createMaster("lengthPreset", payload)}
              emptyMessage="No presets — use + to add"
            />

            {availableLengths.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border p-4 sm:grid-cols-4"
              >
                <Field>
                  <FieldLabel>Preset</FieldLabel>
                  <Select
                    value={row.lengthPresetId}
                    onValueChange={(val) =>
                      setAvailableLengths((prev) =>
                        prev.map((l) =>
                          l.id === row.id ? { ...l, lengthPresetId: val } : l,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Or custom below" />
                    </SelectTrigger>
                    <SelectContent>
                      {options?.lengthPresets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label ?? `${p.value} ${p.unit}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Custom value</FieldLabel>
                  <Input
                    inputMode="decimal"
                    value={row.customValue}
                    onChange={(e) =>
                      setAvailableLengths((prev) =>
                        prev.map((l) =>
                          l.id === row.id
                            ? { ...l, customValue: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Unit</FieldLabel>
                  <Select
                    value={row.customUnit}
                    onValueChange={(val) =>
                      setAvailableLengths((prev) =>
                        prev.map((l) =>
                          l.id === row.id ? { ...l, customUnit: val } : l,
                        ),
                      )
                    }
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
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setAvailableLengths((prev) =>
                        prev.filter((l) => l.id !== row.id),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAvailableLengths((prev) => [
                  ...prev,
                  { id: newId(), customValue: "", customUnit: "METRE" },
                ])
              }
            >
              Add length option
            </Button>
          </div>
        </FormSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection step={7} title="Lead time & availability">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="leadDays">Lead time (days)</FieldLabel>
              <Input
                id="leadDays"
                inputMode="numeric"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="leadDate">Lead time date</FieldLabel>
              <Input
                id="leadDate"
                type="date"
                value={leadTimeDate}
                onChange={(e) => setLeadTimeDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="availDate">Availability date</FieldLabel>
              <Input
                id="availDate"
                type="date"
                value={availabilityDate}
                onChange={(e) => setAvailabilityDate(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </FormSection>

        <FormSection step={8} title="Care instructions">
          <MasterSelectAdd
            label="Care instruction"
            placeholder="Select to add"
            masterType="care"
            dialogTitle="New care instruction"
            clearOnSelect
            onValueChange={(id) => {
              if (!selectedCare.includes(id)) {
                setSelectedCare((prev) => [...prev, id]);
              }
            }}
            options={
              options?.careInstructions
                .filter((c) => !selectedCare.includes(c.id))
                .map((c) => ({ id: c.id, label: c.title })) ?? []
            }
            adding={addingMaster === "care"}
            onConfirmAdd={(payload) =>
              createMaster("care", payload, (item) => {
                setSelectedCare((prev) => [...prev, item.id]);
              })
            }
          />

          {selectedCare.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedCare.map((id) => {
                const care = options?.careInstructions.find((c) => c.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="gap-2 py-1 pr-1 pl-2"
                  >
                    {care?.title}
                    <button
                      type="button"
                      className="hover:bg-muted rounded px-1 text-xs"
                      onClick={() =>
                        setSelectedCare((prev) => prev.filter((x) => x !== id))
                      }
                    >
                      ×
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </FormSection>
      </div>

      <div className="sticky bottom-0 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Spinner /> {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  step,
  title,
  children,
  className,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle>{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ImageUploadList({
  rows,
  onChange,
  stageImage,
  removeImage,
}: {
  rows: ImageRow[];
  onChange: React.Dispatch<React.SetStateAction<ImageRow[]>>;
  stageImage: (
    file: File,
    rowId: string,
    setter: React.Dispatch<React.SetStateAction<ImageRow[]>>,
  ) => void;
  removeImage: (
    row: ImageRow,
    setter: React.Dispatch<React.SetStateAction<ImageRow[]>>,
  ) => Promise<void>;
}) {
  const setter = onChange;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.id} className="space-y-2">
            <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={row.uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) stageImage(f, row.id, setter);
                  e.target.value = "";
                }}
              />
              {row.preview || row.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.preview || row.url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
                  Add image
                </span>
              )}
              {row.uploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Spinner />
                </span>
              ) : null}
            </label>
            <div className="flex gap-1.5">
              <Input
                placeholder="Alt text"
                value={row.altText ?? ""}
                className="h-8 min-w-0 flex-1 text-xs"
                onChange={(e) =>
                  setter((prev) =>
                    prev.map((img) =>
                      img.id === row.id
                        ? { ...img, altText: e.target.value }
                        : img,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                disabled={rows.length === 1 && !row.url && !row.file}
                onClick={() => removeImage(row, setter)}
                aria-label="Remove image"
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setter((prev) => [...prev, emptyImageRow()])}
      >
        Add image
      </Button>
    </div>
  );
}
