const CLIENT_TIMEOUT_MS = 20000;

export async function loadCordonPlan(latitude, longitude) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetch("/api/incident/cordon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
      signal: controller.signal,
    });

    let data;
    try {
      data = await res.json();
    } catch {
      return {
        plan: null,
        error: "Invalid response from server. Tap Retry.",
      };
    }

    if (res.ok) {
      return { plan: data, error: null };
    }

    return {
      plan: null,
      error:
        data?.error ||
        "Road network data temporarily unavailable. Tap Retry.",
    };
  } catch (err) {
    if (err?.name === "AbortError") {
      return {
        plan: null,
        error: "Analysis timed out. Tap Retry in a few seconds.",
      };
    }
    return {
      plan: null,
      error: "Could not reach server. Check connection and tap Retry.",
    };
  } finally {
    clearTimeout(timer);
  }
}
