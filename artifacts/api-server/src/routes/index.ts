import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import notesRouter from "./notes";
import groupsRouter from "./groups";
import groupInvitesRouter from "./groupInvites";
import pushRouter from "./push";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(notesRouter);
router.use(groupsRouter);
router.use(groupInvitesRouter);
router.use(pushRouter);

export default router;
