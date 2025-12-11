import { Router } from "express";

const router: Router = Router();

router.route("/").get().post().put();

export default router;
