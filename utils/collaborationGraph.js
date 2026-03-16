const buildCrewAdjacency = (credits) => {
  const productionMap = new Map();
  const adjacencyMap = new Map();

  for (const credit of credits) {
    const productionId = String(credit.productionId);
    const crewId = String(credit.crewId);

    if (!productionMap.has(productionId)) {
      productionMap.set(productionId, new Set());
    }

    productionMap.get(productionId).add(crewId);
  }

  for (const [productionId, crewIds] of productionMap.entries()) {
    const members = [...crewIds];

    for (let index = 0; index < members.length; index += 1) {
      const sourceId = members[index];

      if (!adjacencyMap.has(sourceId)) {
        adjacencyMap.set(sourceId, new Map());
      }

      for (let innerIndex = index + 1; innerIndex < members.length; innerIndex += 1) {
        const targetId = members[innerIndex];

        if (!adjacencyMap.has(targetId)) {
          adjacencyMap.set(targetId, new Map());
        }

        const sourceNeighbors = adjacencyMap.get(sourceId);
        const targetNeighbors = adjacencyMap.get(targetId);
        const sourceEdge =
          sourceNeighbors.get(targetId) || { sharedCredits: 0, sharedProductionIds: new Set() };
        const targetEdge =
          targetNeighbors.get(sourceId) || { sharedCredits: 0, sharedProductionIds: new Set() };

        sourceEdge.sharedCredits += 1;
        targetEdge.sharedCredits += 1;
        sourceEdge.sharedProductionIds.add(productionId);
        targetEdge.sharedProductionIds.add(productionId);

        sourceNeighbors.set(targetId, sourceEdge);
        targetNeighbors.set(sourceId, targetEdge);
      }
    }
  }

  return adjacencyMap;
};

module.exports = {
  buildCrewAdjacency
};
