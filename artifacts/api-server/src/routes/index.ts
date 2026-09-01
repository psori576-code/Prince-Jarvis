import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commandsRouter from "./commands";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commandsRouter);
router.use(chatRouter);

export default router;
