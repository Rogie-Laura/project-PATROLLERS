/**
 * Build CALABARZON flood-prone and storm-surge overlays from Project NOAH shapefiles.
 * Source: https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps
 * Run: npm run build:hydromet-overlays
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import shp from "shpjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "map-overlays", "calabarzon");
const HF_BASE =
  "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/main";

const CALABARZON_PROVINCES = ["Cavite", "Batangas", "Laguna", "Rizal", "Quezon"];

const FLOOD_LABELS = { 1: "Low", 2: "Medium", 3: "High" };
const STORM_SURGE_LABELS = [
  "SSA 1 (2.01–3 m)",
  "SSA 2 (3.01–4 m)",
  "SSA 3 (4.01–5 m)",
  "SSA 4 (>5 m)",
];

function decimateCoordinates(coordinates, step) {
  if (typeof coordinates[0] === "number") {
    return [
      Number(coordinates[0].toFixed(4)),
      Number(coordinates[1].toFixed(4)),
    ];
  }
  if (typeof coordinates[0][0] === "number") {
    if (coordinates.length <= 4) return coordinates;
    const simplified = [];
    for (let i = 0; i < coordinates.length; i += step) {
      simplified.push([
        Number(coordinates[i][0].toFixed(4)),
        Number(coordinates[i][1].toFixed(4)),
      ]);
    }
    const last = coordinates[coordinates.length - 1];
    const tail = simplified[simplified.length - 1];
    const lastPair = [Number(last[0].toFixed(4)), Number(last[1].toFixed(4))];
    if (!tail || tail[0] !== lastPair[0] || tail[1] !== lastPair[1]) {
      simplified.push(lastPair);
    }
    return simplified;
  }
  return coordinates.map((ring) => decimateCoordinates(ring, step));
}

async function downloadNoah(relativePath) {
  const response = await fetch(`${HF_BASE}${relativePath}`, {
    headers: { "User-Agent": "PATROLLERS-overlay-builder/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${relativePath}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function buildFloodProneOverlays() {
  const floodDir = path.join(OUT_DIR, "flood-prone");
  await fs.mkdir(floodDir, { recursive: true });

  for (const province of CALABARZON_PROVINCES) {
    console.log(`  flood ${province}`);
    const geojson = await shp(
      await downloadNoah(`/Flood/100yr/${encodeURIComponent(province)}.zip`),
    );
    const features = (geojson.features ?? [])
      .filter((feature) => Number(feature.properties?.Var) >= 2)
      .map((feature) => {
      const level = Number(feature.properties?.Var);
      return {
        type: "Feature",
        properties: {
          province,
          level,
          label: FLOOD_LABELS[level] ?? `Level ${level}`,
        },
        geometry: {
          ...feature.geometry,
          coordinates: decimateCoordinates(feature.geometry.coordinates, 250),
        },
      };
    });

    const outPath = path.join(floodDir, `${province.toLowerCase()}.geojson`);
    await fs.writeFile(outPath, JSON.stringify({ type: "FeatureCollection", features }));
    const sizeMb = (Buffer.byteLength(JSON.stringify(features)) / (1024 * 1024)).toFixed(2);
    console.log(`    wrote ${path.basename(outPath)} (${features.length} zones, ${sizeMb} MB)`);
  }
}

async function buildStormSurgeOverlay() {
  const features = [];

  for (let ssa = 1; ssa <= 4; ssa += 1) {
    for (const province of CALABARZON_PROVINCES) {
      console.log(`  storm surge SSA${ssa} ${province}`);
      try {
        const geojson = await shp(
          await downloadNoah(
            `/Storm%20Surge/StormSurgeAdvisory${ssa}/${encodeURIComponent(province)}.zip`,
          ),
        );
        for (const feature of geojson.features ?? []) {
          features.push({
            type: "Feature",
            properties: {
              province,
              ssa,
              label: STORM_SURGE_LABELS[ssa - 1],
            },
            geometry: {
              ...feature.geometry,
              coordinates: decimateCoordinates(feature.geometry.coordinates, 60),
            },
          });
        }
      } catch (error) {
        console.log(`    skip ${province} SSA${ssa}: ${error.message}`);
      }
    }
  }

  const outPath = path.join(OUT_DIR, "storm-surge.geojson");
  await fs.writeFile(outPath, JSON.stringify({ type: "FeatureCollection", features }));
  const sizeMb = (Buffer.byteLength(JSON.stringify(features)) / (1024 * 1024)).toFixed(2);
  console.log(`  wrote storm-surge.geojson (${features.length} zones, ${sizeMb} MB)`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log("Building flood-prone overlays…");
  await buildFloodProneOverlays();
  console.log("Building storm-surge overlay…");
  await buildStormSurgeOverlay();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
