/**
 * Download PHIVOLCS Taal hazard KMZ files and emit GeoJSON for map overlays.
 * Run: node scripts/build-taal-hazard-overlays.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { kml } from "@tmcw/togeojson";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "map-overlays", "taal");
const PHIVOLCS_BASE =
  "https://gisweb.phivolcs.dost.gov.ph/gisweb/storage/hazard-maps/region-iv-a-(calabarzon)/batangas/provincial/volcano";

const LAYERS = [
  {
    output: "base-surge.geojson",
    kmzPaths: [
      `${PHIVOLCS_BASE}/pyroclastic-flow/pdc_2020_041000000_01.kmz`,
      `${PHIVOLCS_BASE}/pyroclastic-flow/pdc_2020_041000000_02.kmz`,
    ],
  },
  {
    output: "volcanic-tsunami.geojson",
    kmzPaths: [
      `${PHIVOLCS_BASE}/volcanic-tsunami/slo_2020_041000000_01.kmz`,
      `${PHIVOLCS_BASE}/volcanic-tsunami/slo_2020_041000000_02.kmz`,
    ],
  },
  {
    output: "fissure.geojson",
    kmzPaths: [`${PHIVOLCS_BASE}/fissure/fis_2025_041000000_01.kmz`],
  },
  {
    output: "ballistic-projectile.geojson",
    kmzPaths: [
      `${PHIVOLCS_BASE}/ballistic-projectile/bap_2020_041000000_01.kmz`,
      `${PHIVOLCS_BASE}/ballistic-projectile/bap_2020_041000000_02.kmz`,
    ],
  },
  {
    output: "lahar.geojson",
    kmzPaths: [`${PHIVOLCS_BASE}/lahar/lhr_2023_041000000_04.kmz`],
  },
];

async function kmzUrlToGeoJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "PATROLLERS-map-overlay-builder/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  const kmlEntry = Object.values(zip.files).find(
    (file) => !file.dir && file.name.toLowerCase().endsWith(".kml"),
  );
  if (!kmlEntry) {
    throw new Error(`No KML found in ${url}`);
  }

  const kmlText = await kmlEntry.async("string");
  const doc = new DOMParser().parseFromString(kmlText, "text/xml");
  return kml(doc);
}

function mergeFeatureCollections(collections) {
  const features = [];
  for (const collection of collections) {
    for (const feature of collection.features ?? []) {
      if (!feature?.geometry) continue;
      features.push(feature);
    }
  }
  return { type: "FeatureCollection", features };
}

async function buildLayer(layer) {
  const collections = [];
  for (const url of layer.kmzPaths) {
    console.log(`  fetch ${path.basename(url)}`);
    collections.push(await kmzUrlToGeoJson(url));
  }

  const merged = mergeFeatureCollections(collections);
  const outPath = path.join(OUT_DIR, layer.output);
  await fs.writeFile(outPath, JSON.stringify(merged));
  const sizeMb = (Buffer.byteLength(JSON.stringify(merged)) / (1024 * 1024)).toFixed(2);
  console.log(`  wrote ${layer.output} (${merged.features.length} features, ${sizeMb} MB)`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const layer of LAYERS) {
    console.log(`Building ${layer.output}...`);
    await buildLayer(layer);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
