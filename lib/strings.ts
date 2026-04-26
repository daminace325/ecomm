/**
 * Convert an arbitrary string into a URL-safe slug.
 * Lowercases, replaces non-alphanumeric runs with hyphens, trims edge hyphens.
 */
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Escape a string for safe use inside a RegExp pattern.
 */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
