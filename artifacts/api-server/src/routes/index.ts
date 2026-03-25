import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import newsRouter from "./news";
import socialRouter from "./social";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import dmRouter from "./dm";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(newsRouter);
router.use(socialRouter);
router.use(usersRouter);
router.use(notificationsRouter);
router.use(dmRouter);
router.use(aiRouter);

export default router;
