import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import leavesRouter from "./leaves";
import outpassesRouter from "./outpasses";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import departmentsRouter from "./departments";
import classesRouter from "./classes";
import hostelBlocksRouter from "./hostel_blocks";
import enrollmentRouter from "./enrollment";
import gateLogsRouter from "./gate_logs";
import locationRouter from "./location";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(leavesRouter);
router.use(outpassesRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(departmentsRouter);
router.use(classesRouter);
router.use(hostelBlocksRouter);
router.use(enrollmentRouter);
router.use(gateLogsRouter);
router.use(locationRouter);

export default router;
