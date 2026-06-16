/**
 * Build Calabarzon cell-coverage JSON layers from OpenCelliD Philippines (MCC 515).
 *
 * Usage:
 *   OPENCELLID_API_KEY=pk.xxx node scripts/build-cell-coverage.mjs
 *
 * Or place a manual export at data/opencellid/515.csv.gz and run without a key.
 *
 * Output: public/coverage/*.json
 */

import { createGunzip } from "node:zlib";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "coverage");
const DATA_DIR = join(ROOT, "data", "opencellid");

const PH_MCC = 515;
const CALABARZON = { latMin: 13.62, latMax: 15.08, lonMin: 120.7, lonMax: 122.4 };
const GRID = 0.015; // ~1.6 km grid snap
const MAX_POINTS = 4000;

const LAYER_SPECS = [
  { file: "globe-lte.json", mnc: 2, radio: "LTE" },
  { file: "globe-nr.json", mnc: 2, radio: "NR" },
  { file: "smart-lte.json", mnc: 3, radio: "LTE" },
  { file: "smart-nr.json", mnc: 3, radio: "NR" },
];

function inCalabarzon(lat, lon) {
  return (
    lat >= CALABARZON.latMin &&
    lat <= CALABARZON.latMax &&
    lon >= CALABARZON.lonMin &&
    lon <= CALABARZON.lonMax
  );
}

function gridKey(lat, lon) {
  const glat = Math.round(lat / GRID) * GRID;
  const glon = Math.round(lon / GRID) * GRID;
  return `${glat.toFixed(4)},${glon.toFixed(4)}`;
}

function parseCsvLine(line) {
  // radio,mcc,mnc,lac,cellid,unit,lon,lat,range,samples,...
  const parts = line.split(",");
  if (parts.length < 10) return null;
  const radio = parts[0]?.trim().toUpperCase();
  const mcc = Number(parts[1]);
  const mnc = Number(parts[2]);
  const lon = Number(parts[6]);
  const lat = Number(parts[7]);
  const samples = Number(parts[9]) || 1;
  if (mcc !== PH_MCC || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { radio, mnc, lat, lon, samples };
}

function aggregateBuckets(rows, mnc, radio) {
  const buckets = new Map();
  for (const row of rows) {
    if (row.mnc !== mnc || row.radio !== radio) continue;
    if (!inCalabarzon(row.lat, row.lon)) continue;
    const key = gridKey(row.lat, row.lon);
    const prev = buckets.get(key) ?? { lat: 0, lon: 0, weight: 0, count: 0 };
    prev.lat += row.lat * row.samples;
    prev.lon += row.lon * row.samples;
    prev.weight += row.samples;
    prev.count += 1;
    buckets.set(key, prev);
  }

  const points = [...buckets.values()]
    .map(({ lat, lon, weight, count }) => {
      const avgLat = lat / weight;
      const avgLon = lon / weight;
      const intensity = Math.min(1, 0.2 + Math.log10(weight + 1) * 0.25);
      return { lat: avgLat, lon: avgLon, intensity, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_POINTS)
    .map(({ lat, lon, intensity }) => [lat, lon, Number(intensity.toFixed(3))]);

  return points;
}

async function downloadPhCsv(token) {
  mkdirSync(DATA_DIR, { recursive: true });
  const dest = join(DATA_DIR, "515.csv.gz");
  const url = `https://opencellid.org/ocid/downloads?token=${encodeURIComponent(token)}&type=mcc&file=515.csv.gz`;
  console.log("Downloading OpenCelliD PH (515)...", url.replace(token, "***"));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(dest, buffer);
  console.log("Saved", dest);
  return dest;
}

async function readCsvRows(sourcePath) {
  const isGz = sourcePath.endsWith(".gz");
  const input = createReadStream(sourcePath);
  const stream = isGz ? input.pipe(createGunzip()) : input;
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  const rows = [];
  let first = true;
  for await (const line of rl) {
    if (first) {
      first = false;
      if (line.toLowerCase().includes("radio")) continue;
    }
    const row = parseCsvLine(line);
    if (row) rows.push(row);
  }
  return rows;
}

function writeLayer(file, points, meta) {
  const payload = {
    source: "OpenCelliD",
    mcc: PH_MCC,
    region: "Calabarzon",
    generatedAt: new Date().toISOString(),
    pointCount: points.length,
    ...meta,
    points,
  };
  const outPath = join(OUT_DIR, file);
  writeFileSync(outPath, JSON.stringify(payload));
  console.log(`  ${file}: ${points.length} points`);
}

/** Demo clusters when no OpenCelliD file is available (visual smoke test only). */
function generateDemoPoints(mnc, radio) {
  const seeds =
    mnc === 2
      ? [
          [14.21, 121.17],
          [13.94, 121.16],
          [14.63, 121.18],
          [13.93, 121.62],
          [14.07, 121.33],
        ]
      : [
          [13.76, 121.07],
          [14.28, 120.87],
          [14.11, 120.96],
          [13.88, 121.05],
          [14.45, 121.05],
        ];

  const density = radio === "NR" ? 35 : 90;
  const points = [];
  for (const [clat, clon] of seeds) {
    for (let i = 0; i < density; i += 1) {
      const lat = clat + (Math.random() - 0.5) * 0.35;
      const lon = clon + (Math.random() - 0.5) * 0.35;
      if (!inCalabarzon(lat, lon)) continue;
      const intensity = 0.25 + Math.random() * 0.55;
      points.push([
        Number(lat.toFixed(5)),
        Number(lon.toFixed(5)),
        Number(intensity.toFixed(3)),
      ]);
    }
  }
  return points.slice(0, MAX_POINTS);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const token = process.env.OPENCELLID_API_KEY?.trim();
  let sourcePath = join(DATA_DIR, "515.csv.gz");
  if (!existsSync(sourcePath)) {
    sourcePath = join(DATA_DIR, "515.csv");
  }

  let rows = null;
  if (existsSync(sourcePath)) {
    console.log("Reading", sourcePath);
    rows = await readCsvRows(sourcePath);
    console.log("Parsed", rows.length, "PH tower rows");
  } else if (token) {
    sourcePath = await downloadPhCsv(token);
    rows = await readCsvRows(sourcePath);
    console.log("Parsed", rows.length, "PH tower rows");
  } else {
    console.warn(
      "No OpenCelliD file or OPENCELLID_API_KEY — writing demo Calabarzon sample data."
    );
    console.warn("Register at https://opencellid.org/ and re-run for real tower data.");
  }

  for (const spec of LAYER_SPECS) {
    const points = rows
      ? aggregateBuckets(rows, spec.mnc, spec.radio)
      : generateDemoPoints(spec.mnc, spec.radio);
    writeLayer(spec.file, points, {
      mnc: spec.mnc,
      radio: spec.radio,
      demo: !rows,
    });
  }

  const manifest = {
    source: rows ? "OpenCelliD" : "demo",
    region: "Calabarzon",
    generatedAt: new Date().toISOString(),
    layers: LAYER_SPECS.map((s) => s.file),
    attribution: "https://opencellid.org/",
  };
  const manifestPath = join(OUT_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Done →", OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
