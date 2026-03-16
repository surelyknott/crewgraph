const mongoose = require("mongoose");

const Crew = require("../models/Crew");
const Credit = require("../models/Credit");
const Production = require("../models/Production");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");

const ensureObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid crew id", 400);
  }
};

const getCrew = asyncHandler(async (_req, res) => {
  const crew = await Crew.find().sort({ name: 1 }).lean();

  res.json({
    count: crew.length,
    data: crew
  });
});

const getCrewById = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const crew = await Crew.findById(req.params.id).lean();

  if (!crew) {
    throw new AppError("Crew member not found", 404);
  }

  const credits = await Credit.find({ crewId: crew._id })
    .populate("productionId")
    .lean();

  res.json({
    ...crew,
    credits: credits.map((credit) => ({
      _id: credit._id,
      role: credit.role,
      production: credit.productionId
    }))
  });
});

const getCrewCollaborators = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const crew = await Crew.findById(req.params.id).lean();

  if (!crew) {
    throw new AppError("Crew member not found", 404);
  }

  const baseCredits = await Credit.find({ crewId: crew._id }).lean();
  const productionIds = baseCredits.map((credit) => credit.productionId);

  if (productionIds.length === 0) {
    return res.json({
      crew,
      count: 0,
      data: []
    });
  }

  const collaborators = await Credit.aggregate([
    {
      $match: {
        productionId: { $in: productionIds },
        crewId: { $ne: crew._id }
      }
    },
    {
      $group: {
        _id: "$crewId",
        collaborationCount: { $sum: 1 },
        sharedProductionIds: { $addToSet: "$productionId" },
        roles: { $addToSet: "$role" }
      }
    },
    {
      $lookup: {
        from: "crews",
        localField: "_id",
        foreignField: "_id",
        as: "crew"
      }
    },
    {
      $unwind: "$crew"
    },
    {
      $lookup: {
        from: "productions",
        localField: "sharedProductionIds",
        foreignField: "_id",
        as: "sharedProductions"
      }
    },
    {
      $project: {
        _id: 0,
        crew: {
          _id: "$crew._id",
          name: "$crew.name",
          role: "$crew.role",
          avatar: "$crew.avatar"
        },
        collaborationCount: 1,
        roles: 1,
        sharedProductions: {
          $map: {
            input: "$sharedProductions",
            as: "production",
            in: {
              _id: "$$production._id",
              title: "$$production.title",
              year: "$$production.year",
              tmdbId: "$$production.tmdbId"
            }
          }
        }
      }
    },
    {
      $sort: {
        collaborationCount: -1,
        "crew.name": 1
      }
    }
  ]);

  res.json({
    crew,
    count: collaborators.length,
    data: collaborators
  });
});

const getCrewNetwork = asyncHandler(async (req, res) => {
  ensureObjectId(req.params.id);

  const crew = await Crew.findById(req.params.id).lean();

  if (!crew) {
    throw new AppError("Crew member not found", 404);
  }

  const credits = await Credit.find({ crewId: crew._id }).lean();
  const productionIds = credits.map((credit) => credit.productionId);

  if (productionIds.length === 0) {
    return res.json({
      center: crew,
      nodes: [
        {
          id: String(crew._id),
          type: "crew",
          label: crew.name,
          role: crew.role,
          avatar: crew.avatar
        }
      ],
      edges: []
    });
  }

  const [productions, networkCredits] = await Promise.all([
    Production.find({ _id: { $in: productionIds } }).lean(),
    Credit.find({ productionId: { $in: productionIds } })
      .populate("crewId")
      .populate("productionId")
      .lean()
  ]);

  const nodeMap = new Map();
  const edgeMap = new Map();

  nodeMap.set(String(crew._id), {
    id: String(crew._id),
    type: "crew",
    label: crew.name,
    role: crew.role,
    avatar: crew.avatar,
    center: true
  });

  for (const production of productions) {
    nodeMap.set(String(production._id), {
      id: String(production._id),
      type: "production",
      label: production.title,
      year: production.year,
      tmdbId: production.tmdbId
    });
  }

  for (const credit of networkCredits) {
    const collaborator = credit.crewId;
    const production = credit.productionId;

    nodeMap.set(String(collaborator._id), {
      id: String(collaborator._id),
      type: "crew",
      label: collaborator.name,
      role: collaborator.role,
      avatar: collaborator.avatar,
      center: String(collaborator._id) === String(crew._id)
    });

    const edgeKey = `${credit.crewId._id}-${credit.productionId._id}-${credit.role}`;

    edgeMap.set(edgeKey, {
      source: String(collaborator._id),
      target: String(production._id),
      role: credit.role
    });
  }

  res.json({
    center: crew,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values())
  });
});

module.exports = {
  getCrew,
  getCrewById,
  getCrewCollaborators,
  getCrewNetwork
};
