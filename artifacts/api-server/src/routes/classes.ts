import { Router, type IRouter } from "express";
import { db, classesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/classes", async (req, res): Promise<void> => {
  try {
    const { departmentId } = req.query;
    let query = db.select().from(classesTable).$dynamic();
    if (departmentId) {
      query = query.where(eq(classesTable.departmentId, parseInt(String(departmentId), 10)));
    }
    const classes = await query.orderBy(classesTable.year, classesTable.section);
    res.json(classes);
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

router.post("/classes", async (req, res): Promise<void> => {
  try {
    const [{ id }] = await db.insert(classesTable).values({
      departmentId: req.body.departmentId,
      year: req.body.year,
      section: req.body.section,
      tutorId: req.body.tutorId ?? null,
    }).$returningId();
    const [created] = await db.select().from(classesTable).where(eq(classesTable.id, id));
    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create class:", error);
    res.status(400).json({ error: "Failed to create class" });
  }
});

router.patch("/classes/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(classesTable).set({
      ...(req.body.tutorId !== undefined ? { tutorId: req.body.tutorId } : {}),
      ...(req.body.section !== undefined ? { section: req.body.section } : {}),
    }).where(eq(classesTable.id, id));
    const [updated] = await db.select().from(classesTable).where(eq(classesTable.id, id));
    if (!updated) { res.status(404).json({ error: "Class not found" }); return; }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update class" });
  }
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
  try {
    await db.delete(classesTable).where(eq(classesTable.id, parseInt(req.params.id, 10)));
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete class" });
  }
});

export default router;
