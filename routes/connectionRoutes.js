const express = require("express");

const { getConnectionPath } = require("../controllers/connectionController");

const router = express.Router();

router.get("/:crewA/:crewB", getConnectionPath);

module.exports = router;
