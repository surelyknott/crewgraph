const API_BASE_URL = "http://localhost:3000";

const graphElement = document.getElementById("graph");
const selectedCrewElement = document.getElementById("selected-crew");
const nodeCountElement = document.getElementById("node-count");
const linkCountElement = document.getElementById("link-count");
const statusElement = document.getElementById("status");
const searchInputElement = document.getElementById("crew-search");
const searchResultsElement = document.getElementById("search-results");
const connectionFromElement = document.getElementById("connection-from");
const connectionToElement = document.getElementById("connection-to");
const connectionFromResultsElement = document.getElementById("connection-from-results");
const connectionToResultsElement = document.getElementById("connection-to-results");
const connectionButtonElement = document.getElementById("find-connection-button");
const connectionResultElement = document.getElementById("connection-result");
const clearPathButtonElement = document.getElementById("clear-path-button");
const productionPanelTitleElement = document.getElementById("production-panel-title");
const productionListElement = document.getElementById("production-list");

const TMDB_POSTERS_BY_ID = {
  155: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  27205: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  37799: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
  152601: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg",
  244786: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
  76341: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
  264660: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg",
  313369: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
  376867: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/rcICfiL9fvwRjoWHxW8QeroLYrJ.jpg",
  419430: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
  335984: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  324857: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
  496243: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
  545611: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
  693134: "https://media.themoviedb.org/t/p/w300_and_h450_bestv2/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg"
};

const networkCache = new Map();
let crewDirectory = [];
let selectedCrewId = null;
let isLoadingNetwork = false;
let focusedStrengthMap = new Map();
let maxFocusedSharedCredits = 1;
const glowAnimationStarted = { value: false };
let currentBaseGraphData = null;
let currentCenterCrew = null;
let currentSelectedProductions = [];
let highlightedPathNodeIds = new Set();
let highlightedPathEdgeKeys = new Set();
let revealedPathNodeIds = new Set();
let pathPulseUntilMap = new Map();
let activeConnectionData = null;
let connectionAnimationTimers = [];
let currentMaxNodeDistance = 1;

const getCrewLinkKey = (leftId, rightId) => [String(leftId), String(rightId)].sort().join("::");
const isPathModeActive = () => highlightedPathNodeIds.size > 0;

const graph = ForceGraph()(graphElement)
  .backgroundColor("#0f0f0f")
  .nodeRelSize(6)
  .linkColor((link) => {
    if (!isPathModeActive()) {
      const sourceDistance = typeof link.source === "object" ? link.source.distance : 4;
      const targetDistance = typeof link.target === "object" ? link.target.distance : 4;
      const edgeDistance = Math.max(sourceDistance, targetDistance);
      const alphaByDistance = currentMaxNodeDistance <= 2
        ? [0.42, 0.14, 0.02, 0.01, 0.01]
        : [0.42, 0.18, 0.06, 0.025, 0.015];

      return `rgba(245, 247, 250, ${alphaByDistance[Math.min(edgeDistance, 4)]})`;
    }

    return highlightedPathEdgeKeys.has(link.key)
      ? "rgba(255, 209, 102, 0.88)"
      : "rgba(245, 247, 250, 0.08)";
  })
  .linkWidth((link) => {
    if (!isPathModeActive()) {
      return 1.5;
    }

    return highlightedPathEdgeKeys.has(link.key) ? 4.5 : 1;
  })
  .linkLabel((link) => `Worked together on ${link.sharedCredits || 1} production${(link.sharedCredits || 1) === 1 ? "" : "s"}`)
  .nodeLabel((node) => {
    const strength = focusedStrengthMap.get(String(node.id)) || 0;

    if (isPathModeActive() && highlightedPathNodeIds.has(String(node.id)) && node.id !== selectedCrewId) {
      const pathIndex = activeConnectionData?.path?.findIndex(
        (pathNode) => String(pathNode._id) === String(node.id)
      );
      const position = Number.isInteger(pathIndex) ? `Path step ${pathIndex + 1}` : "Connection path";

      return `${position}<br/>${node.label}`;
    }

    if (node.id === selectedCrewId || strength === 0) {
      return "";
    }

    return `Worked together on ${strength} production${strength === 1 ? "" : "s"}`;
  })
  .linkDirectionalParticles(0)
  .d3AlphaDecay(0.018)
  .d3VelocityDecay(0.24)
  .cooldownTime(20000)
  .nodeCanvasObject((node, ctx, globalScale) => {
    const label = node.label;
    const strength = focusedStrengthMap.get(String(node.id)) || 0;
    const now = Date.now();
    const pulse = 0.5 + Math.sin(now / 520) * 0.5;
    const isPathNode = highlightedPathNodeIds.has(String(node.id));
    const isRevealedPathNode = revealedPathNodeIds.has(String(node.id));
    const pulseUntil = pathPulseUntilMap.get(String(node.id)) || 0;
    const hasPulse = pulseUntil > now;
    const distance = Number.isInteger(node.distance) ? node.distance : 4;
    const opacityByDistance = currentMaxNodeDistance <= 2
      ? [1, 0.72, 0.14, 0.08, 0.06]
      : [1, 0.82, 0.34, 0.12, 0.08];
    const sizeByDistance = currentMaxNodeDistance <= 2
      ? [12, 7.2, 4.2, 3.8, 3.6]
      : [11.5, 7.8, 5.2, 4.1, 3.7];
    const nodeOpacity = opacityByDistance[Math.min(distance, 4)];
    const baseRadius = sizeByDistance[Math.min(distance, 4)];
    const nodeRadius = isPathNode ? Math.max(baseRadius + 1.5, node.center ? 11 : 8) : baseRadius;

    if (!node.center && !isPathModeActive() && strength > 0) {
      const normalizedStrength = strength / maxFocusedSharedCredits;
      const emphasis = Math.pow(normalizedStrength, 3.2);
      const glowRadius = nodeRadius + 1 + emphasis * 18 + pulse * (1 + emphasis * 5);
      const glowAlpha = 0.015 + emphasis * 0.34 + pulse * emphasis * 0.12;

      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = `rgba(255, 209, 102, ${Math.min(glowAlpha, 0.34).toFixed(3)})`;
      ctx.fill();
    }

    if (isPathNode) {
      const revealFactor = isRevealedPathNode ? 1 : 0.35;
      const pulseScale = hasPulse ? 8 + pulse * 8 : 0;

      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius + 6 + pulseScale, 0, 2 * Math.PI, false);
      ctx.fillStyle = `rgba(255, 209, 102, ${(0.14 + revealFactor * 0.16 + (hasPulse ? 0.16 : 0)).toFixed(3)})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
    if (isPathModeActive()) {
      ctx.fillStyle = isPathNode
        ? "#ffd166"
        : "rgba(217, 240, 255, 0.18)";
    } else {
      ctx.fillStyle = node.center
        ? "#ffd166"
        : `rgba(217, 240, 255, ${nodeOpacity.toFixed(3)})`;
    }
    ctx.fill();

    const fontSize = Math.max(10, 15 / globalScale);
    ctx.font = `${fontSize}px Space Grotesk, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = isPathModeActive() && !isPathNode
      ? "rgba(245, 247, 250, 0.28)"
      : `rgba(245, 247, 250, ${(node.center ? 0.98 : Math.max(0.22, nodeOpacity)).toFixed(3)})`;
    ctx.fillText(label, node.x, node.y + nodeRadius + 4);
  })
  .onNodeClick((node) => {
    if (isLoadingNetwork) {
      return;
    }

    if (node.id === selectedCrewId) {
      graph.centerAt(node.x, node.y, 900);
      graph.zoom(4.2, 900);
      return;
    }

    loadCrewNetwork(node.id);
  })
  .onNodeDrag((node) => {
    node.fx = node.x;
    node.fy = node.y;
  })
  .onNodeDragEnd((node) => {
    node.fx = node.x;
    node.fy = node.y;
  })
  .onNodeRightClick((node) => {
    node.fx = undefined;
    node.fy = undefined;
    graph.d3ReheatSimulation();
  });

const chargeForce = graph.d3Force("charge");
const linkForce = graph.d3Force("link");

if (chargeForce && typeof chargeForce.strength === "function") {
  chargeForce.strength(-520);
}

if (linkForce && typeof linkForce.distance === "function") {
  linkForce.distance((link) => 160 + Math.min((link.value || 1) * 18, 90));
}

const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const hideSearchResults = () => {
  searchResultsElement.hidden = true;
  searchResultsElement.innerHTML = "";
};

const renderConnectionPlaceholder = (message) => {
  clearPathButtonElement.hidden = true;
  connectionResultElement.innerHTML = `<p class="connection-empty">${message}</p>`;
};

const renderSearchResults = (matches) => {
  if (!matches.length) {
    searchResultsElement.innerHTML = '<div class="search-empty">No matching crew members.</div>';
    searchResultsElement.hidden = false;
    return;
  }

  searchResultsElement.innerHTML = matches
    .map(
      (crew) => `
        <button class="search-result" type="button" data-crew-id="${crew._id}">
          <span class="search-result-name">${crew.name}</span>
          <span class="search-result-role">${crew.role}</span>
        </button>
      `
    )
    .join("");

  searchResultsElement.hidden = false;
};

const updateSearchInput = (crew) => {
  searchInputElement.value = crew.name;
};

const resolveCrewByName = (name) => {
  const normalizedName = name.trim().toLowerCase();

  if (!normalizedName) {
    return null;
  }

  return crewDirectory.find((crew) => crew.name.toLowerCase() === normalizedName) || null;
};

const filterConnectionCrewDirectory = (query) => {
  const normalizedQuery = query.trim().toLowerCase();

  return crewDirectory
    .filter((crew) => !normalizedQuery || crew.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
};

const hideConnectionDropdown = (resultsElement) => {
  resultsElement.hidden = true;
  resultsElement.innerHTML = "";
};

const renderConnectionDropdown = (resultsElement, matches) => {
  if (!matches.length) {
    resultsElement.innerHTML = '<div class="search-empty">No matching crew members.</div>';
    resultsElement.hidden = false;
    return;
  }

  resultsElement.innerHTML = matches
    .map(
      (crew) => `
        <button class="connection-option" type="button" data-crew-name="${crew.name}">
          <span class="connection-option-name">${crew.name}</span>
          <span class="connection-option-role">${crew.role}</span>
        </button>
      `
    )
    .join("");

  resultsElement.hidden = false;
};

const setupConnectionAutocomplete = (inputElement, resultsElement) => {
  const renderMatches = () => {
    renderConnectionDropdown(resultsElement, filterConnectionCrewDirectory(inputElement.value));
  };

  inputElement.addEventListener("focus", renderMatches);
  inputElement.addEventListener("click", renderMatches);
  inputElement.addEventListener("input", renderMatches);

  resultsElement.addEventListener("click", (event) => {
    const optionButton = event.target.closest("[data-crew-name]");

    if (!optionButton) {
      return;
    }

    inputElement.value = optionButton.dataset.crewName;
    hideConnectionDropdown(resultsElement);
    inputElement.focus();
  });
};

const updateFocusedStrengths = (graphData, crewId) => {
  focusedStrengthMap = new Map();
  maxFocusedSharedCredits = 1;

  for (const link of graphData.links) {
    const sourceId = String(link.source);
    const targetId = String(link.target);
    const sharedCredits = Number(link.sharedCredits || 1);

    if (sourceId === String(crewId)) {
      focusedStrengthMap.set(targetId, sharedCredits);
      maxFocusedSharedCredits = Math.max(maxFocusedSharedCredits, sharedCredits);
    } else if (targetId === String(crewId)) {
      focusedStrengthMap.set(sourceId, sharedCredits);
      maxFocusedSharedCredits = Math.max(maxFocusedSharedCredits, sharedCredits);
    }
  }
};

const filterCrewDirectory = (query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return crewDirectory
    .filter((crew) => crew.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 8);
};

const buildCollaborationGraph = (networkData) => {
  const crewNodes = networkData.nodes.filter((node) => node.type === "crew");
  const productionNodes = networkData.nodes.filter((node) => node.type === "production");
  const productionMembership = new Map();
  const nodeMap = new Map();

  for (const node of crewNodes) {
    nodeMap.set(String(node.id), {
      id: String(node.id),
      label: node.label,
      role: node.role,
      avatar: node.avatar,
      center: Boolean(node.center)
    });
  }

  for (const edge of networkData.edges) {
    const productionId = String(edge.target);
    const crewId = String(edge.source);

    if (!nodeMap.has(crewId)) {
      continue;
    }

    if (!productionMembership.has(productionId)) {
      productionMembership.set(productionId, new Set());
    }

    productionMembership.get(productionId).add(crewId);
  }

  const linkMap = new Map();

  for (const members of productionMembership.values()) {
    const ids = [...members];

    for (let index = 0; index < ids.length; index += 1) {
      for (let innerIndex = index + 1; innerIndex < ids.length; innerIndex += 1) {
        const pair = [ids[index], ids[innerIndex]].sort();
        const key = pair.join("::");

        if (!linkMap.has(key)) {
          linkMap.set(key, {
            source: pair[0],
            target: pair[1],
            sharedCredits: 0,
            key
          });
        }

        linkMap.get(key).sharedCredits += 1;
      }
    }
  }

  const links = [...linkMap.values()];
  const degreeMap = new Map();
  const adjacencyMap = new Map();

  for (const link of links) {
    degreeMap.set(link.source, (degreeMap.get(link.source) || 0) + link.sharedCredits);
    degreeMap.set(link.target, (degreeMap.get(link.target) || 0) + link.sharedCredits);

    if (!adjacencyMap.has(link.source)) {
      adjacencyMap.set(link.source, new Set());
    }

    if (!adjacencyMap.has(link.target)) {
      adjacencyMap.set(link.target, new Set());
    }

    adjacencyMap.get(link.source).add(link.target);
    adjacencyMap.get(link.target).add(link.source);
  }

  const centerId = String(networkData.center._id);
  const distanceMap = new Map([[centerId, 0]]);
  const queue = [centerId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const currentDistance = distanceMap.get(currentId);

    for (const neighborId of adjacencyMap.get(currentId) || []) {
      if (distanceMap.has(neighborId)) {
        continue;
      }

      distanceMap.set(neighborId, currentDistance + 1);
      queue.push(neighborId);
    }
  }

  const nodes = [...nodeMap.values()].map((node) => ({
    ...node,
    val: Math.max(1, degreeMap.get(node.id) || 1),
    distance: distanceMap.has(String(node.id)) ? distanceMap.get(String(node.id)) : 4
  }));

  const selectedProductions = [...new Set(
    networkData.edges
      .filter((edge) => String(edge.source) === String(networkData.center._id))
      .map((edge) => String(edge.target))
  )]
    .map((productionId) => productionNodes.find((node) => String(node.id) === productionId))
    .filter(Boolean)
    .sort((left, right) => right.year - left.year || left.label.localeCompare(right.label));

  return { nodes, links, selectedProductions };
};

const cloneGraphData = (graphData) => ({
  nodes: graphData.nodes.map((node) => ({ ...node })),
  links: graphData.links.map((link) => ({
    ...link,
    source: typeof link.source === "object" ? String(link.source.id) : String(link.source),
    target: typeof link.target === "object" ? String(link.target.id) : String(link.target)
  }))
});

const mergeConnectionPathIntoGraph = (graphData, connectionData) => {
  const cloned = cloneGraphData(graphData);
  const nodeMap = new Map(cloned.nodes.map((node) => [String(node.id), node]));
  const linkMap = new Map(cloned.links.map((link) => [link.key, link]));

  for (const pathNode of connectionData.path) {
    const nodeId = String(pathNode._id);

    if (!nodeMap.has(nodeId)) {
      nodeMap.set(nodeId, {
        id: nodeId,
        label: pathNode.name,
        role: pathNode.role,
        center: nodeId === String(connectionData.path[0]._id),
        val: 2.5
      });
    }
  }

  for (const segment of connectionData.segments) {
    const key = getCrewLinkKey(segment.source, segment.target);

    if (!linkMap.has(key)) {
      linkMap.set(key, {
        source: String(segment.source),
        target: String(segment.target),
        sharedCredits: segment.sharedCredits,
        key
      });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values())
  };
};

const updateSelectedCrew = (crew) => {
  selectedCrewId = String(crew._id);
  selectedCrewElement.textContent = `${crew.name} (${crew.role})`;
  updateSearchInput(crew);
};

const renderProductionsPanel = (crew, productions) => {
  productionPanelTitleElement.textContent = `${crew.name}'s Productions`;

  if (!productions.length) {
    productionListElement.innerHTML = '<p class="production-empty">No productions found for this crew member.</p>';
    return;
  }

  productionListElement.innerHTML = productions
    .map(
      (production) => `
        <article class="production-item">
          <img
            class="production-poster"
            src="${TMDB_POSTERS_BY_ID[production.tmdbId] || ""}"
            alt="${production.label} poster"
            loading="lazy"
          />
          <div class="production-content">
            <div class="production-item-header">
              <span class="production-item-title">${production.label}</span>
              <span class="production-item-year">${production.year}</span>
            </div>
            <div class="production-item-meta">TMDB ID: ${production.tmdbId}</div>
          </div>
        </article>
      `
    )
    .join("");
};

const focusOnCenterNode = (data, crewId) => {
  let attempts = 0;
  const maxAttempts = 40;

  const intervalId = window.setInterval(() => {
    const centerNode = data.nodes.find((node) => node.id === String(crewId));

    if (!centerNode) {
      window.clearInterval(intervalId);
      return;
    }

    attempts += 1;

    if (Number.isFinite(centerNode.x) && Number.isFinite(centerNode.y)) {
      graph.centerAt(centerNode.x, centerNode.y, 1200);
      graph.zoom(4.2, 1200);
      window.clearInterval(intervalId);
    } else if (attempts >= maxAttempts) {
      window.clearInterval(intervalId);
    }
  }, 250);
};

const clearConnectionAnimationTimers = () => {
  connectionAnimationTimers.forEach((timerId) => window.clearTimeout(timerId));
  connectionAnimationTimers = [];
};

const clearConnectionState = (resetPanel = true) => {
  clearConnectionAnimationTimers();
  highlightedPathNodeIds = new Set();
  highlightedPathEdgeKeys = new Set();
  revealedPathNodeIds = new Set();
  pathPulseUntilMap = new Map();
  activeConnectionData = null;
  clearPathButtonElement.hidden = true;

  if (resetPanel) {
    renderConnectionPlaceholder("Select two crew members to reveal the shortest path.");
  }
};

const renderConnectionResult = (connectionData) => {
  const parts = [];

  connectionData.path.forEach((crew, index) => {
    parts.push(`<div class="connection-path-person">${crew.name}</div>`);

    if (index < connectionData.segments.length) {
      const productionTitle = connectionData.segments[index]?.production?.title || "Unknown production";
      parts.push(`<div class="connection-path-production">↓ ${productionTitle}</div>`);
    }
  });

  connectionResultElement.innerHTML = `
    <strong class="connection-result-title">Connection Found</strong>
    <p class="connection-result-degrees">Degrees of Separation: ${connectionData.degrees}</p>
    <div class="connection-path">${parts.join("")}</div>
  `;
  clearPathButtonElement.hidden = false;
};

const animateConnectionReveal = (pathIds) => {
  clearConnectionAnimationTimers();
  revealedPathNodeIds = new Set();
  pathPulseUntilMap = new Map();

  pathIds.forEach((nodeId, index) => {
    const timerId = window.setTimeout(() => {
      const now = Date.now();

      revealedPathNodeIds.add(String(nodeId));
      pathPulseUntilMap.set(String(nodeId), now + 850);
    }, index * 320);

    connectionAnimationTimers.push(timerId);
  });
};

const applyConnectionPath = (connectionData) => {
  activeConnectionData = connectionData;
  highlightedPathNodeIds = new Set(connectionData.path.map((crew) => String(crew._id)));
  highlightedPathEdgeKeys = new Set(
    connectionData.segments.map((segment) => getCrewLinkKey(segment.source, segment.target))
  );

  const mergedGraphData = mergeConnectionPathIntoGraph(currentBaseGraphData, connectionData);

  graph.graphData(mergedGraphData);
  graph.d3ReheatSimulation();
  focusOnCenterNode(mergedGraphData, connectionData.path[0]._id);
  renderConnectionResult(connectionData);
  animateConnectionReveal(connectionData.path.map((crew) => crew._id));
};

const restoreCurrentNetworkGraph = () => {
  if (!currentBaseGraphData || !currentCenterCrew) {
    return;
  }

  graph.graphData(currentBaseGraphData);
  graph.d3ReheatSimulation();
  focusOnCenterNode(currentBaseGraphData, currentCenterCrew._id);
};

const renderGraph = (graphData, crew, productions, options = {}) => {
  const baseGraphData = cloneGraphData(graphData);

  updateSelectedCrew(crew);
  updateFocusedStrengths(baseGraphData, crew._id);
  currentMaxNodeDistance = Math.max(
    1,
    ...baseGraphData.nodes.map((node) => (Number.isInteger(node.distance) ? node.distance : 0))
  );
  nodeCountElement.textContent = String(baseGraphData.nodes.length);
  linkCountElement.textContent = String(baseGraphData.links.length);
  renderProductionsPanel(crew, productions);
  currentBaseGraphData = baseGraphData;
  currentCenterCrew = crew;
  currentSelectedProductions = productions;

  if (!options.preserveConnection) {
    clearConnectionState();
  }

  graph.graphData(cloneGraphData(baseGraphData));
  graph.d3ReheatSimulation();
  focusOnCenterNode(baseGraphData, crew._id);
};

const loadCrewNetwork = async (crewId, options = {}) => {
  try {
    isLoadingNetwork = true;
    statusElement.textContent = "Fetching collaboration network...";
    hideSearchResults();

    if (networkCache.has(String(crewId))) {
      const cached = networkCache.get(String(crewId));
      renderGraph(cloneGraphData(cached.graphData), cached.center, cached.selectedProductions, options);
      statusElement.textContent = "Graph ready. Drag, zoom, and click nodes to explore.";
      return;
    }

    const networkData = await fetchJson(`${API_BASE_URL}/crew/${crewId}/network`);
    const graphData = buildCollaborationGraph(networkData);
    const center = networkData.center;
    const selectedProductions = graphData.selectedProductions;

    networkCache.set(String(crewId), {
      graphData: cloneGraphData(graphData),
      center,
      selectedProductions
    });
    renderGraph(graphData, center, selectedProductions, options);
    statusElement.textContent = "Graph ready. Drag, zoom, and click nodes to explore.";
  } catch (error) {
    statusElement.textContent = error.message;
    console.error(error);
  } finally {
    isLoadingNetwork = false;
  }
};

const handleSearchInput = () => {
  const query = searchInputElement.value;

  if (!query.trim()) {
    hideSearchResults();
    return;
  }

  const matches = filterCrewDirectory(query);
  renderSearchResults(matches);
};

const setupSearch = () => {
  searchInputElement.addEventListener("input", handleSearchInput);

  searchResultsElement.addEventListener("click", (event) => {
    const resultButton = event.target.closest("[data-crew-id]");

    if (!resultButton || isLoadingNetwork) {
      return;
    }

    loadCrewNetwork(resultButton.dataset.crewId);
  });

  document.addEventListener("click", (event) => {
    if (event.target === searchInputElement || searchResultsElement.contains(event.target)) {
      return;
    }

    hideSearchResults();
  });

  searchInputElement.addEventListener("focus", () => {
    if (!searchInputElement.value.trim()) {
      return;
    }

    handleSearchInput();
  });
};

const setupConnectionFinder = () => {
  setupConnectionAutocomplete(connectionFromElement, connectionFromResultsElement);
  setupConnectionAutocomplete(connectionToElement, connectionToResultsElement);

  connectionButtonElement.addEventListener("click", async () => {
    const sourceCrew = resolveCrewByName(connectionFromElement.value);
    const targetCrew = resolveCrewByName(connectionToElement.value);

    if (!sourceCrew || !targetCrew) {
      renderConnectionPlaceholder("Choose valid crew names from the dataset for both fields.");
      return;
    }

    try {
      statusElement.textContent = "Finding shortest collaboration path...";
      const connectionData = await fetchJson(
        `${API_BASE_URL}/connection/${sourceCrew._id}/${targetCrew._id}`
      );

      await loadCrewNetwork(sourceCrew._id, { preserveConnection: true });
      applyConnectionPath(connectionData);
      statusElement.textContent = "Connection path highlighted.";
    } catch (error) {
      clearConnectionState(false);
      connectionResultElement.innerHTML = `<p class="connection-empty">${error.message}</p>`;
      statusElement.textContent = error.message;
      console.error(error);
    }
  });

  clearPathButtonElement.addEventListener("click", () => {
    clearConnectionState();
    restoreCurrentNetworkGraph();
    statusElement.textContent = "Graph ready. Drag, zoom, and click nodes to explore.";
  });

  document.addEventListener("click", (event) => {
    if (
      event.target === connectionFromElement ||
      connectionFromResultsElement.contains(event.target)
    ) {
      return;
    }

    if (
      event.target === connectionToElement ||
      connectionToResultsElement.contains(event.target)
    ) {
      return;
    }

    hideConnectionDropdown(connectionFromResultsElement);
    hideConnectionDropdown(connectionToResultsElement);
  });
};

const startGlowAnimation = () => {
  if (glowAnimationStarted.value) {
    return;
  }

  glowAnimationStarted.value = true;

  const tick = () => {
    if (typeof graph.refresh === "function") {
      graph.refresh();
    }

    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
};

const initializeGraph = async () => {
  try {
    statusElement.textContent = "Fetching crew list...";

    const crewResponse = await fetchJson(`${API_BASE_URL}/crew`);
    crewDirectory = crewResponse.data || [];
    const selectedCrew = crewResponse.data?.[0];

    if (!selectedCrew) {
      throw new Error("No crew members were returned by the API.");
    }

    setupSearch();
    setupConnectionFinder();
    startGlowAnimation();
    await loadCrewNetwork(selectedCrew._id);
  } catch (error) {
    statusElement.textContent = error.message;
    selectedCrewElement.textContent = "Unavailable";
    nodeCountElement.textContent = "0";
    linkCountElement.textContent = "0";
    console.error(error);
  }
};

initializeGraph();
