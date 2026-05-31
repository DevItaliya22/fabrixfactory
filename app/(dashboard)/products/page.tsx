import Link from "next/link";

import { ProductList } from "@/components/products/product-list";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your fabric catalogue
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">Add product</Link>
        </Button>
      </div>
      <ProductList />
    </div>
  );
}
