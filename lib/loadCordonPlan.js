import { analyzeCordon } from "@/lib/cordonAnalysis";
import { fetchOverpassElements } from "@/lib/overpassClient";

export async function loadCordonPlanFromBrowser(latitude, longitude) {
  const elements = await fetchOverpassElements(latitude, longitude);
  const osmNodes = elements.filter((el) => el.type === "node");
  const osmWays = elements.filter((el) => el.type === "way");

  return analyzeCordon({
    incidentLat: latitude,
    incidentLon: longitude,
    osmNodes,
    osmWays,
  });
}

export async function loadCordonPlan(latitude, longitude) {
  const res = await fetch("/api/incident/cordon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });

  const data = await res.json();

  if (res.ok) {
    return { plan: data, error: null };
  }

  if (data?.retryable) {
    try {
      const plan = await loadCordonPlanFromBrowser(latitude, longitude);
      return { plan, error: null };
    } catch {
      return {
        plan: null,
        error:
          data.error ||
          "Road data is busy. Wait a moment and tap Retry.",
      };
    }
  }

  return {
    plan: null,
    error: data.error || "Cordon analysis failed",
  };
}
