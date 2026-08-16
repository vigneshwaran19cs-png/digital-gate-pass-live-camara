import { Router, type IRouter } from "express";
import { db, hostelBlocksTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/hostel-blocks", async (req, res): Promise<void> => {
  try {
    const blocks = await db.select().from(hostelBlocksTable).orderBy(hostelBlocksTable.name);
    const withWardens = await Promise.all(
      blocks.map(async (block) => {
        let warden = null;
        if (block.wardenId) {
          const [w] = await db.select().from(usersTable).where(eq(usersTable.id, block.wardenId));
          if (w) {
            const { passwordHash: _, ...safeWarden } = w;
            warden = safeWarden;
          }
        }
        return { ...block, warden };
      })
    );
    res.json(withWardens);
  } catch (error) {
    console.error("Failed to fetch hostel blocks:", error);
    res.status(500).json({ error: "Failed to fetch hostel blocks" });
  }
});

router.post("/hostel-blocks", async (req, res): Promise<void> => {
  try {
    const { name, code, genderType, totalRooms, totalCapacity, wardenId } = req.body;
    const [{ id }] = await db.insert(hostelBlocksTable).values({
      name,
      code,
      genderType: genderType || "boys",
      totalRooms: totalRooms || 50,
      totalCapacity: totalCapacity || 200,
      wardenId: wardenId || null,
    }).$returningId();

    const [created] = await db.select().from(hostelBlocksTable).where(eq(hostelBlocksTable.id, id));
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: "Failed to create hostel block" });
  }
});

router.delete("/hostel-blocks/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(hostelBlocksTable).where(eq(hostelBlocksTable.id, id));
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete hostel block" });
  }
});

export default router;
