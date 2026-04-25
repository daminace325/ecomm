import Link from "next/link";

type ProductCardProduct = {
    _id: string;
    title: string;
    slug: string;
    price: number;
    currency?: string;
    images?: string[];
};

export default function ProductCard({ product }: { product: ProductCardProduct }) {
    const cover = product.images?.[0];
    return (
        <Link
            href={`/p/${product.slug}`}
            className="group flex flex-col rounded-md border border-zinc-200 bg-white p-3 transition hover:shadow-md"
        >
            <div className="aspect-square w-full overflow-hidden rounded bg-zinc-100">
                {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={cover}
                        alt={product.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                        No image
                    </div>
                )}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm text-zinc-800">{product.title}</h3>
            <p className="mt-auto pt-2 text-base font-semibold text-zinc-900">
                {product.currency ?? "INR"} {product.price}
            </p>
        </Link>
    );
}
