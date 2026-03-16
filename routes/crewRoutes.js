const express = require("express");

const {
  getCrew,
  getCrewById,
  getCrewCollaborators,
  getCrewNetwork
} = require("../controllers/crewController");

const router = express.Router();

router.get("/", getCrew);
router.get("/:id/collaborators", getCrewCollaborators);
router.get("/:id/network", getCrewNetwork);
router.get("/:id", getCrewById);

module.exports = router;
