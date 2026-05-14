import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import coursesRouter from "./courses";
import fileSubmissionsRouter from "./file-submissions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(fileSubmissionsRouter);

export default router;
