import {
  smartLocatorPlotLabel,
  smartLocatorSubcategoryLabel,
} from "@/lib/smartLocator/categories";

export function pointFromRow(row) {
  if (!row) return null;

  const category = row.category ?? "";
  const subcategory = row.subcategory ?? "";

  return {
    id: row.id,
    category,
    subcategory,
    category_label: smartLocatorPlotLabel(category, subcategory),
    subcategory_label: smartLocatorSubcategoryLabel(category, subcategory),
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
