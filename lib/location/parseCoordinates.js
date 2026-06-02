export function parseLocationPayload(body) {
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const accuracy =
    body?.accuracy === null || body?.accuracy === undefined
      ? null
      : Number(body.accuracy);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { error: "Invalid coordinates." };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Coordinates out of range." };
  }

  if (accuracy !== null && Number.isNaN(accuracy)) {
    return { error: "Invalid accuracy value." };
  }

  return { latitude, longitude, accuracy };
}
