import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminAuthRouter from "./admin-auth";
import adminPackagesRouter from "./admin-packages";
import adminTestimonialsRouter from "./admin-testimonials";
import adminBookingsRouter from "./admin-bookings";
import adminSettingsRouter from "./admin-settings";
import publicPackagesRouter from "./public-packages";
import publicBookingsRouter from "./public-bookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(adminPackagesRouter);
router.use(adminTestimonialsRouter);
router.use(adminBookingsRouter);
router.use(adminSettingsRouter);
router.use(publicPackagesRouter);
router.use(publicBookingsRouter);

export default router;
