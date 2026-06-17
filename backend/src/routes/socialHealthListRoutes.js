/**
 * ============================================================
 * ROUTES: SocialHealthList
 * ============================================================
 */

const express = require("express");
const router = express.Router();
const { getSocialHealthList } = require("../controllers/socialHealthListController");

router.get("/", getSocialHealthList);

module.exports = router;
