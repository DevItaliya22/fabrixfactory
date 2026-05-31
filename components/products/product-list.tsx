"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  skuCode: string | null;
  status: string;
  stockStatus: string;
  viewCount: number;
  width: { label: string } | null;
  fabricComposition: { name: string } | null;
  productImages: { url: string }[];
  _count: { productColours: number; productImages: number };
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export function ProductList() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProducts(data.products);
      })
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Spinner />
        Loading products…
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">No products yet.</p>
        <Button asChild>
          <Link href="/products/new">Add your first product</Link>
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Width</TableHead>
          <TableHead>Fabric</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const thumb = product.productImages[0]?.url;
          return (
            <TableRow key={product.id}>
              <TableCell>
                <div className="size-12 overflow-hidden rounded-md bg-muted">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{product.name}</div>
                {product.slug && (
                  <div className="text-muted-foreground text-xs">
                    {product.slug}
                  </div>
                )}
              </TableCell>
              <TableCell>{product.skuCode ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[product.status] ?? "secondary"}>
                  {product.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{product.stockStatus}</TableCell>
              <TableCell className="text-sm">
                {product.width?.label ?? "—"}
              </TableCell>
              <TableCell className="text-sm">
                {product.fabricComposition?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/products/${product.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
