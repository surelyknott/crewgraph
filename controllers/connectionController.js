const mongoose = require("mongoose");

const Crew = require("../models/Crew");
const Credit = require("../models/Credit");
const Production = require("../models/Production");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../utils/errors");
const { buildCrewAdjacency } = require("../utils/collaborationGraph");

const ensureObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid crew id", 400);
  }
};

const getConnectionPath = asyncHandler(async (req, res) => {
  const { crewA, crewB } = req.params;

  ensureObjectId(crewA);
  ensureObjectId(crewB);

  const [startCrew, endCrew] = await Promise.all([
    Crew.findById(crewA).lean(),
    Crew.findById(crewB).lean()
  ]);

  if (!startCrew || !endCrew) {
    throw new AppError("One or both crew members were not found", 404);
  }

  if (crewA === crewB) {
    return res.json({
      degrees: 0,
      path: [
        {
          _id: startCrew._id,
          name: startCrew.name,
          role: startCrew.role
        }
      ],
      segments: [],
      requestedPair: {
        source: {
          _id: startCrew._id,
          name: startCrew.name,
          role: startCrew.role
        },
        target: {
          _id: endCrew._id,
          name: endCrew.name,
          role: endCrew.role
        }
      },
      sharedProductions: []
    });
  }

  const credits = await Credit.find({}, { crewId: 1, productionId: 1 }).lean();
  const adjacencyMap = buildCrewAdjacency(credits);
  const queue = [String(crewA)];
  const visited = new Set(queue);
  const parentMap = new Map();

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (currentId === String(crewB)) {
      break;
    }

    const neighbors = adjacencyMap.get(currentId);

    if (!neighbors) {
      continue;
    }

    for (const neighborId of neighbors.keys()) {
      if (visited.has(neighborId)) {
        continue;
      }

      visited.add(neighborId);
      parentMap.set(neighborId, currentId);
      queue.push(neighborId);
    }
  }

  if (!visited.has(String(crewB))) {
    throw new AppError("No collaboration path found", 404);
  }

  const pathIds = [];
  let currentId = String(crewB);

  while (currentId) {
    pathIds.push(currentId);
    currentId = parentMap.get(currentId);
  }

  pathIds.reverse();

  const pathCrewDocs = await Crew.find(
    { _id: { $in: pathIds } },
    { name: 1, role: 1 }
  ).lean();

  const crewMap = new Map(pathCrewDocs.map((crew) => [String(crew._id), crew]));

  const path = pathIds.map((id) => {
    const crew = crewMap.get(id);

    return {
      _id: crew._id,
      name: crew.name,
      role: crew.role
    };
  });

  const segmentMetadata = [];
  const sharedProductionIds = new Set();

  for (let index = 0; index < pathIds.length - 1; index += 1) {
    const sourceId = pathIds[index];
    const targetId = pathIds[index + 1];
    const metadata = adjacencyMap.get(sourceId)?.get(targetId);

    segmentMetadata.push({
      source: sourceId,
      target: targetId,
      sharedCredits: metadata?.sharedCredits || 0,
      sharedProductionIds: [...(metadata?.sharedProductionIds || [])]
    });

    for (const productionId of metadata?.sharedProductionIds || []) {
      sharedProductionIds.add(productionId);
    }
  }

  const sharedProductions = await Production.find(
    { _id: { $in: [...sharedProductionIds] } },
    { title: 1, year: 1, tmdbId: 1 }
  ).lean();
  const productionMap = new Map(sharedProductions.map((production) => [String(production._id), production]));

  const segments = [];

  for (const metadata of segmentMetadata) {
    const representativeProduction = metadata.sharedProductionIds
      .map((productionId) => productionMap.get(String(productionId)))
      .filter(Boolean)
      .sort((left, right) => right.year - left.year || left.title.localeCompare(right.title))[0];

    segments.push({
      source: metadata.source,
      target: metadata.target,
      sharedCredits: metadata.sharedCredits,
      production: representativeProduction
        ? {
            _id: representativeProduction._id,
            title: representativeProduction.title,
            year: representativeProduction.year,
            tmdbId: representativeProduction.tmdbId
          }
        : null
    });
  }

  const directSharedMetadata = adjacencyMap.get(String(crewA))?.get(String(crewB));
  const directSharedProductions = [...(directSharedMetadata?.sharedProductionIds || [])]
    .map((productionId) => productionMap.get(String(productionId)))
    .filter(Boolean)
    .sort((left, right) => right.year - left.year || left.title.localeCompare(right.title))
    .map((production) => ({
      _id: production._id,
      title: production.title,
      year: production.year,
      tmdbId: production.tmdbId
    }));

  res.json({
    degrees: Math.max(0, path.length - 1),
    path,
    segments,
    requestedPair: {
      source: {
        _id: startCrew._id,
        name: startCrew.name,
        role: startCrew.role
      },
      target: {
        _id: endCrew._id,
        name: endCrew.name,
        role: endCrew.role
      }
    },
    sharedProductions: directSharedProductions
  });
});

module.exports = {
  getConnectionPath
};
