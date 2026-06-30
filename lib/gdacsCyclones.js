/** Western Pacific + PAR — storms relevant to Philippine command monitoring. */
export const TYPHOON_FOCUS_BBOX = {
  west: 100,
  south: 0,
  east: 140,
  north: 30,
};

const GDACS_TC_LIST_URL =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC";

function inFocusBbox(lng, lat) {
  return (
    lng >= TYPHOON_FOCUS_BBOX.west &&
    lng <= TYPHOON_FOCUS_BBOX.east &&
    lat >= TYPHOON_FOCUS_BBOX.south &&
    lat <= TYPHOON_FOCUS_BBOX.north
  );
}

function mentionsPhilippines(properties) {
  const country = String(properties?.country ?? "");
  if (/philippine/i.test(country)) return true;

  const affected = properties?.affectedcountries;
  if (!Array.isArray(affected)) return false;
  return affected.some(
    (entry) => entry?.iso3 === "PHL" || entry?.iso2 === "PH"
  );
}

export function eventSummaryInFocus(eventFeature) {
  if (!eventFeature?.geometry || !eventFeature?.properties) return false;

  if (mentionsPhilippines(eventFeature.properties)) return true;

  const { geometry } = eventFeature;
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates ?? [];
    return inFocusBbox(Number(lng), Number(lat));
  }

  return false;
}

function keepGeometryFeature(feature) {
  const cls = String(feature?.properties?.Class ?? "");
  if (!cls) return false;
  if (cls === "Point_Centroid") return true;
  if (cls.startsWith("Line_Line")) return true;
  if (cls.startsWith("Point_Polygon_Point")) return true;
  if (
    cls === "Poly_Red" ||
    cls === "Poly_Orange" ||
    cls === "Poly_Green" ||
    cls === "Poly_Cones"
  ) {
    return true;
  }
  return false;
}

export async function fetchGdacsTyphoonTracks() {
  const year = new Date().getUTCFullYear();
  const listUrl = `${GDACS_TC_LIST_URL}&fromdate=${year}-01-01+00:00&todate=${year}-12-31+23:59`;

  const listRes = await fetch(listUrl, { next: { revalidate: 900 } });
  if (!listRes.ok) {
    throw new Error("Could not load tropical cyclone list from GDACS.");
  }

  const listData = await listRes.json();
  const events = Array.isArray(listData?.features) ? listData.features : [];

  let focusedEvents = events.filter((event) => eventSummaryInFocus(event));

  if (focusedEvents.length === 0) {
    focusedEvents = events.filter(
      (event) => String(event?.properties?.iscurrent ?? "") === "true"
    );
  }

  const currentFirst = [...focusedEvents].sort((a, b) => {
    const aCurrent = String(a?.properties?.iscurrent ?? "") === "true" ? 1 : 0;
    const bCurrent = String(b?.properties?.iscurrent ?? "") === "true" ? 1 : 0;
    return bCurrent - aCurrent;
  });

  const limited = currentFirst.slice(0, 6);
  const trackFeatures = [];

  for (const event of limited) {
    const props = event.properties ?? {};
    const eventtype = props.eventtype ?? "TC";
    const eventid = props.eventid;
    const episodeid = props.episodeid;
    if (!eventid || !episodeid) continue;

    const geometryUrl =
      props.url?.geometry ??
      `https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=${eventtype}&eventid=${eventid}&episodeid=${episodeid}`;

    try {
      const geometryRes = await fetch(geometryUrl, { next: { revalidate: 900 } });
      if (!geometryRes.ok) continue;

      const geometryData = await geometryRes.json();
      const features = Array.isArray(geometryData?.features)
        ? geometryData.features
        : [];

      for (const feature of features) {
        if (!keepGeometryFeature(feature)) continue;
        trackFeatures.push({
          ...feature,
          properties: {
            ...feature.properties,
            eventname: props.eventname ?? props.name ?? "Tropical Cyclone",
            alertlevel: props.alertlevel ?? feature.properties?.alertlevel,
            severitytext:
              props.severitydata?.severitytext ??
              feature.properties?.severitytext ??
              null,
            source: props.source ?? "GDACS/JTWC",
          },
        });
      }
    } catch {
      /* skip event geometry on failure */
    }
  }

  return {
    type: "FeatureCollection",
    features: trackFeatures,
    meta: {
      eventCount: limited.length,
      updatedAt: new Date().toISOString(),
      source: "GDACS",
      focus: "Western Pacific / PAR",
    },
  };
}
