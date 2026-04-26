"use client";

import { useState } from "react";

export default function ProductGallery({
    images,
    title,
}: {
    images: string[];
    title: string;
}) {
    const [active, setActive] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-sm text-slate-400">
                No image
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="aspect-square w-full overflow-hidden rounded-md border border-slate-700 bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={images[active]}
                    alt={title}
                    className="h-full w-full object-cover"
                />
            </div>

            {images.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {images.map((url, idx) => (
                        <button
                            key={url}
                            type="button"
                            onClick={() => setActive(idx)}
                            className={
                                idx === active
                                    ? "h-16 w-16 overflow-hidden rounded border-2 border-sky-500"
                                    : "h-16 w-16 overflow-hidden rounded border border-slate-700 opacity-70 transition hover:opacity-100"
                            }
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt={`${title} thumbnail ${idx + 1}`}
                                className="h-full w-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
