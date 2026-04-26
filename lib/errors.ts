/**
 * Normalise the `error` field from an API response into a user-friendly string.
 *
 * Handles three shapes:
 *   - string                      → returned as-is
 *   - { field: string[] | string } → "field: msg, msg; other: msg"
 *   - anything else / nullish      → fallback message
 */
export function formatApiError(error: unknown, fallback = "Something went wrong"): string {
    if (typeof error === "string" && error.length > 0) return error;
    if (error && typeof error === "object") {
        const entries = Object.entries(error as Record<string, unknown>);
        if (entries.length === 0) return fallback;
        return entries
            .map(([field, value]) => {
                const messages = Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);
                return `${field}: ${messages}`;
            })
            .join("; ");
    }
    return fallback;
}
