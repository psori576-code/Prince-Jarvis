import { Router, type IRouter } from "express";
import healthRouter from "./health";
import commandsRouter from "./commands";

const router: IRouter = Router();

router.use(healthRouter);
router.use(commandsRouter);

export default router;
