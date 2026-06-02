import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import leavesRouter from "./leaves";
import outpassesRouter from "./outpasses";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(leavesRouter);
router.use(outpassesRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);

export default router;
