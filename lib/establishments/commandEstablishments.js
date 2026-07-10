import { createCommandAdminClient } from "@/lib/supabase/commandAdmin";

const PAGE_SIZE = 1000;

function mapEstablishmentRow(row) {
  return {
    id: row.id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    establishmentType: row.establishment_type,
    name: row.name,
    location: row.location,
    ppo: row.ppo,
    station: row.station,
    province: row.province,
  };
}

export async function fetchLatestEstablishmentMapPoints() {
  const supabase = createCommandAdminClient();

  const { data: batch, error: batchError } = await supabase
    .from("establishment_upload_batches")
    .select("id, filename, created_at, record_count")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (batchError) {
    throw new Error(batchError.message);
  }

  if (!batch) {
    return {
      batch: null,
      establishments: [],
    };
  }

  const establishments = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("establishments")
      .select(
        "id, latitude, longitude, establishment_type, name, location, ppo, station, province",
      )
      .eq("batch_id", batch.id)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) break;

    establishments.push(...data.map(mapEstablishmentRow));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return {
    batch: {
      id: batch.id,
      filename: batch.filename,
      createdAt: batch.created_at,
      recordCount: batch.record_count ?? establishments.length,
    },
    establishments,
  };
}
