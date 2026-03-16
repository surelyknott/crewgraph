/* global use, db, ObjectId */
// CrewGraph network playground
// Update the database name below if your Atlas connection string uses a different one.
// Replace the placeholder crew id before running.

use("test");

const crews = db.getCollection("crews");
const productions = db.getCollection("productions");
const credits = db.getCollection("credits");

const crewIdString = "69b854ae056fd4f6db836b75";

if (crewIdString === "PASTE_CREW_ID_HERE") {
  throw new Error("Replace PASTE_CREW_ID_HERE with a real crew _id from the crews collection.");
}

if (!/^[a-fA-F0-9]{24}$/.test(crewIdString)) {
  throw new Error("crewIdString must be a valid 24-character MongoDB ObjectId.");
}

const crewId = new ObjectId(crewIdString);

const center = crews.findOne(
  { _id: crewId },
  { name: 1, role: 1, avatar: 1, createdAt: 1 }
);

if (!center) {
  throw new Error(`No crew member found for id ${crewIdString}`);
}

const baseCredits = credits.find({ crewId }).toArray();
const productionIds = [...new Set(baseCredits.map((credit) => String(credit.productionId)))].map(
  (id) => new ObjectId(id)
);

const nodes = [
  {
    id: String(center._id),
    type: "crew",
    label: center.name,
    role: center.role,
    avatar: center.avatar,
    center: true
  }
];

const edges = [];

if (productionIds.length === 0) {
  ({
    center,
    nodes,
    edges
  });
}

const productionDocs = productions
  .find(
    { _id: { $in: productionIds } },
    { title: 1, year: 1, tmdbId: 1 }
  )
  .toArray();

const networkCredits = credits.find({ productionId: { $in: productionIds } }).toArray();
const collaboratorIds = [
  ...new Set(networkCredits.map((credit) => String(credit.crewId)))
].map((id) => new ObjectId(id));

const collaboratorDocs = crews
  .find(
    { _id: { $in: collaboratorIds } },
    { name: 1, role: 1, avatar: 1 }
  )
  .toArray();

const productionMap = new Map(
  productionDocs.map((production) => [String(production._id), production])
);

const crewMap = new Map(
  collaboratorDocs.map((crew) => [String(crew._id), crew])
);

for (const production of productionDocs) {
  nodes.push({
    id: String(production._id),
    type: "production",
    label: production.title,
    year: production.year,
    tmdbId: production.tmdbId
  });
}

for (const crew of collaboratorDocs) {
  const id = String(crew._id);

  if (id === String(center._id)) {
    continue;
  }

  nodes.push({
    id,
    type: "crew",
    label: crew.name,
    role: crew.role,
    avatar: crew.avatar,
    center: false
  });
}

const edgeMap = new Map();

for (const credit of networkCredits) {
  const crew = crewMap.get(String(credit.crewId));
  const production = productionMap.get(String(credit.productionId));

  if (!crew || !production) {
    continue;
  }

  const edgeKey = `${credit.crewId}-${credit.productionId}-${credit.role}`;

  edgeMap.set(edgeKey, {
    source: String(credit.crewId),
    target: String(credit.productionId),
    role: credit.role
  });
}

edges.push(...edgeMap.values());

const payload = {
  center,
  nodes,
  edges
};

console.log(JSON.stringify(payload, null, 2));

payload;
