import { db, geofencesTable, locationEventsTable, journeySettingsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

/**
 * Haversine formula to compute distance between two GPS coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Seed default geofences if table is empty
 */
export async function ensureDefaultGeofences() {
  try {
    const existing = await db.select().from(geofencesTable);
    if (existing.length === 0) {
      const defaults = [
        { name: "JKKM College Gate", latitude: "11.5362", longitude: "77.7289", radiusMeters: 300, isEnabled: "true" as const },
        { name: "Gandhipuram Bus Stand", latitude: "11.0168", longitude: "76.9558", radiusMeters: 500, isEnabled: "true" as const },
        { name: "Ukkadam Bus Stand", latitude: "10.9935", longitude: "76.9609", radiusMeters: 500, isEnabled: "true" as const },
        { name: "Erode Central Bus Stand", latitude: "11.3410", longitude: "77.7172", radiusMeters: 600, isEnabled: "true" as const },
        { name: "Erode Railway Station", latitude: "11.3320", longitude: "77.7275", radiusMeters: 500, isEnabled: "true" as const },
        { name: "Salem New Bus Stand", latitude: "11.6643", longitude: "78.1460", radiusMeters: 600, isEnabled: "true" as const },
      ];
      for (const item of defaults) {
        await db.insert(geofencesTable).values(item);
      }
    }
  } catch (err) {
    console.error("Geofence table check/seed error:", err);
  }
}

/**
 * Check student GPS position against active geofences.
 * Returns triggered geofences that haven't been notified recently.
 */
export async function checkGeofenceTrigger(
  journeyId: number,
  latitude: number,
  longitude: number
) {
  await ensureDefaultGeofences();

  const activeGeofences = await db
    .select()
    .from(geofencesTable)
    .where(eq(geofencesTable.isEnabled, "true"));

  const [settings] = await db.select().from(journeySettingsTable).limit(1);
  const cooldownMinutes = settings?.geofenceCooldownMinutes ?? 15;
  const cooldownCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const triggeredList: Array<{
    geofenceId: number;
    name: string;
    latitude: string;
    longitude: string;
    distanceMeters: number;
  }> = [];

  for (const gf of activeGeofences) {
    const gfLat = parseFloat(gf.latitude);
    const gfLng = parseFloat(gf.longitude);

    if (isNaN(gfLat) || isNaN(gfLng)) continue;

    const dist = calculateDistanceMeters(latitude, longitude, gfLat, gfLng);

    if (dist <= gf.radiusMeters) {
      const recentEvents = await db
        .select()
        .from(locationEventsTable)
        .where(
          and(
            eq(locationEventsTable.journeyId, journeyId),
            eq(locationEventsTable.geofenceId, gf.id),
            gte(locationEventsTable.triggeredAt, cooldownCutoff)
          )
        )
        .limit(1);

      if (recentEvents.length === 0) {
        triggeredList.push({
          geofenceId: gf.id,
          name: gf.name,
          latitude: gf.latitude,
          longitude: gf.longitude,
          distanceMeters: Math.round(dist),
        });
      }
    }
  }

  return triggeredList;
}
