import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import coursesRouter from "./courses";
import enrollmentsRouter from "./enrollments";
import fileSubmissionsRouter from "./file-submissions";
import submissionSlotsRouter from "./submission-slots";
import invitationsRouter from "./invitations";
import aiRouter from "./ai";
import aiAgentRouter from "./ai-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(enrollmentsRouter);
router.use(fileSubmissionsRouter);
router.use(submissionSlotsRouter);
router.use(invitationsRouter);
router.use(aiRouter);
router.use(aiAgentRouter);

export default router;
