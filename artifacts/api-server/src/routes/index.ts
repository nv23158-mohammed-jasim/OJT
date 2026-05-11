import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import coursesRouter from "./courses";
import enrollmentsRouter from "./enrollments";
import modulesRouter from "./modules";
import quizzesRouter from "./quizzes";
import questionsRouter from "./questions";
import submissionsRouter from "./submissions";
import gradesRouter from "./grades";
import alertsRouter from "./alerts";
import announcementsRouter from "./announcements";
import fileSubmissionsRouter from "./file-submissions";
import invitationsRouter from "./invitations";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(coursesRouter);
router.use(enrollmentsRouter);
router.use(modulesRouter);
router.use(quizzesRouter);
router.use(questionsRouter);
router.use(submissionsRouter);
router.use(gradesRouter);
router.use(alertsRouter);
router.use(announcementsRouter);
router.use(fileSubmissionsRouter);
router.use(invitationsRouter);
router.use(aiRouter);

export default router;
