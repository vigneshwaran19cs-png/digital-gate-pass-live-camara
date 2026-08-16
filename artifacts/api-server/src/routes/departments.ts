import { Router, type IRouter } from "express";
import { db, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/departments", async (req, res): Promise<void> => {
  try {
    const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
    res.json(departments);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

router.post("/departments", async (req, res): Promise<void> => {
  try {
    const [{ id }] = await db.insert(departmentsTable).values({
      code: req.body.code,
      name: req.body.name,
      hodId: req.body.hodId,
    }).$returningId();
    const [created] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: "Failed to create department" });
  }
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.update(departmentsTable).set({
      ...(req.body.code !== undefined ? { code: req.body.code } : {}),
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.hodId !== undefined ? { hodId: req.body.hodId } : {}),
    }).where(eq(departmentsTable.id, id));
    const [updated] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
    if (!updated) { res.status(404).json({ error: "Department not found" }); return; }
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update department" });
  }
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  try {
    await db.delete(departmentsTable).where(eq(departmentsTable.id, parseInt(req.params.id, 10)));
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Failed to delete department" });
  }
});

export default router;
