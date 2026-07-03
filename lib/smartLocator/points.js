import { smartLocatorCategoryLabel } from "@/lib/smartLocator/categories";

export function pointFromRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    category: row.category,
    category_label: smartLocatorCategoryLabel(row.category),
    label: row.label ?? "",
    description: row.description ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    office: row.office ?? "",
    unit: row.unit ?? "",
    created_by: row.created_by ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}
