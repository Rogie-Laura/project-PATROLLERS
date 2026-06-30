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

function isCurrentEvent(event) {
  return String(event?.properties?.iscurrent ?? "") === "true";
}

function eventModifiedMs(event) {
  const raw = event?.properties?.datemodified ?? event?.properties?.fromdate;
  const ms = Date.parse(String(raw ?? ""));
  return Number.isFinite(ms) ? ms : 0;
}

function formatGdacsDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildGdacsListUrl() {
  const to = new Date();
  const from = new Date(to);
  // Typhoon seasons span calendar years — avoid empty results early in the year.
  from.setUTCMonth(from.getUTCMonth() - 14);
  return `${GDACS_TC_LIST_URL}&fromdate=${formatGdacsDate(from)}+00:00&todate=${formatGdacsDate(to)}+23:59`;
}

function rankTyphoonEvents(events) {
  return [...events].sort((a, b) => {
    const aCurrent = isCurrentEvent(a) ? 1 : 0;
    const bCurrent = isCurrentEvent(b) ? 1 : 0;
    if (bCurrent !== aCurrent) return bCurrent - aCurrent;
    return eventModifiedMs(b) - eventModifiedMs(a);
  });
}

function selectTyphoonEvents(events) {
  const inFocus = events.filter((event) => eventSummaryInFocus(event));
  const rankedFocus = rankTyphoonEvents(inFocus);

  if (rankedFocus.some(isCurrentEvent)) {
    return {
      events: rankedFocus.filter(isCurrentEvent).slice(0, 6),
      mode: "active",
    };
  }

  if (rankedFocus.length > 0) {
    return {
      events: rankedFocus.slice(0, 3),
      mode: "recent",
    };
  }

  const globalCurrent = rankTyphoonEvents(events.filter(isCurrentEvent));
  if (globalCurrent.length > 0) {
    return {
      events: globalCurrent.slice(0, 3),
      mode: "active_global",
    };
  }

  return { events: [], mode: "none" };
}

export async function fetchGdacsTyphoonTracks() {
  const listUrl = buildGdacsListUrl();

  const listRes = await fetch(listUrl, { next: { revalidate: 900 } });
  if (!listRes.ok) {
    throw new Error("Could not load tropical cyclone list from GDACS.");
  }

  const listData = await listRes.json();
  const events = Array.isArray(listData?.features) ? listData.features : [];

  const { events: limited, mode } = selectTyphoonEvents(events);
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
            iscurrent: isCurrentEvent(event),
            datemodified: props.datemodified ?? null,
          },
        });
      }
    } catch {
      /* skip event geometry on failure */
    }
  }

  const activeCount = limited.filter(isCurrentEvent).length;

  return {
    type: "FeatureCollection",
    features: trackFeatures,
    meta: {
      eventCount: limited.length,
      activeCount,
      mode,
      hasActiveStorm: activeCount > 0,
      message:
        mode === "none"
          ? "Walang active cyclone sa PAR ngayon. Subukan ulit kapag may bagyo, o tingnan ang PAGASA bulletin."
          : mode === "recent"
            ? "Walang active cyclone — ipinapakita ang pinakabagong track na may kaugnayan sa Pilipinas (historical)."
            : mode === "active_global"
              ? "May active cyclone sa labas ng PAR — ipinapakita ang global track mula sa GDACS."
              : "Active cyclone track sa Western Pacific / PAR.",
      updatedAt: new Date().toISOString(),
      source: "GDACS",
      focus: "Western Pacific / PAR",
    },
  };
}
