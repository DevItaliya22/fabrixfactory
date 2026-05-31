import { ProductCreateForm } from "@/components/products/product-create-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductCreateForm productId={id} />;
}
