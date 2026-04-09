import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminAuthRouter from "./admin-auth";
import adminPackagesRouter from "./admin-packages";
import adminTestimonialsRouter from "./admin-testimonials";
import adminBookingsRouter from "./admin-bookings";
import adminSettingsRouter from "./admin-settings";
import adminRewardsRouter from "./admin-rewards";
import publicPackagesRouter from "./public-packages";
import publicBookingsRouter from "./public-bookings";
import storageRouter from "./storage";
import adminGalleryRouter from "./admin-gallery";
import publicGalleryRouter from "./public-gallery";
import categoriesRouter from "./admin-categories";
import heroSlidesRouter from "./admin-hero-slides";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminAuthRouter);
router.use(adminPackagesRouter);
router.use(adminTestimonialsRouter);
router.use(adminBookingsRouter);
router.use(adminSettingsRouter);
router.use(adminRewardsRouter);
router.use(publicPackagesRouter);
router.use(publicBookingsRouter);
router.use(storageRouter);
router.use(adminGalleryRouter);
router.use(publicGalleryRouter);
router.use(categoriesRouter);
router.use(heroSlidesRouter);

export default router;
