import { Router, type IRouter } from "express";
import { db, geofencesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ensureDefaultGeofences } from "../lib/geofence";

const router: IRouter = Router();

// GET /api/geofences
router.get("/geofences", async (_req, res): Promise<void> => {
  try {
    await ensureDefaultGeofences();
    const list = await db.select().from(geofencesTable).orderBy(desc(geofencesTable.createdAt));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch geofences" });
  }
});

// POST /api/geofences
router.post("/geofences", async (req, res): Promise<void> => {
  try {
    const { name, latitude, longitude, radiusMeters = 500, isEnabled = "true" } = req.body;
    if (!name || !latitude || !longitude) {
      res.status(400).json({ error: "Location name, latitude, and longitude required" });
      return;
    }

    const [inserted] = await db.insert(geofencesTable).values({
      name,
      latitude: String(latitude),
      longitude: String(longitude),
      radiusMeters: Number(radiusMeters),
      isEnabled: isEnabled === "false" ? "false" : "true",
    });

    res.json({ success: true, id: inserted.insertId, message: "Geofence created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create geofence" });
  }
});

// PUT /api/geofences/:id
router.put("/geofences/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, latitude, longitude, radiusMeters, isEnabled } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (latitude !== undefined) updates.latitude = String(latitude);
    if (longitude !== undefined) updates.longitude = String(longitude);
    if (radiusMeters !== undefined) updates.radiusMeters = Number(radiusMeters);
    if (isEnabled !== undefined) updates.isEnabled = isEnabled === "false" ? "false" : "true";

    await db.update(geofencesTable).set(updates).where(eq(geofencesTable.id, id));
    res.json({ success: true, message: "Geofence updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update geofence" });
  }
});

// DELETE /api/geofences/:id
router.delete("/geofences/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(geofencesTable).where(eq(geofencesTable.id, id));
    res.json({ success: true, message: "Geofence deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete geofence" });
  }
});

export default router;
