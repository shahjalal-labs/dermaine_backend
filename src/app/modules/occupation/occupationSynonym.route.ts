import express from "express";
import { occupationSynonymController } from "./occupationSynonym.controller";

const router = express.Router();

router.get("/", occupationSynonymController.getAllOccupationSynonyms);
router.post("/", occupationSynonymController.createOccupationSynonym);

router.delete("/:id", occupationSynonymController.deleteOccupationSynonym);

export const occupationSynonymRoutes = router;
