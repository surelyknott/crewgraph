/* global use, db */
// CrewGraph MongoDB Playground
// If your Atlas connection string points at a different database name, change "crewgraph" below.

use("test");

const crews = db.getCollection("crews");
const productions = db.getCollection("productions");
const credits = db.getCollection("credits");

// Quick sanity checks
console.log(`Crew count: ${crews.countDocuments()}`);
console.log(`Production count: ${productions.countDocuments()}`);
console.log(`Credit count: ${credits.countDocuments()}`);

// Sample crew members
crews.find({}, { name: 1, role: 1, avatar: 1 }).sort({ name: 1 }).limit(10);

// Sample productions
productions.find({}, { title: 1, year: 1, tmdbId: 1 }).sort({ year: 1 }).limit(10);

// Pull one crew member to inspect
const selectedCrew = crews.findOne({}, { name: 1, role: 1, avatar: 1 });
console.log("Selected crew member:");
console.log(selectedCrew);

// Credits for the selected crew member with production details
credits.aggregate([
  {
    $match: {
      crewId: selectedCrew._id
    }
  },
  {
    $lookup: {
      from: "productions",
      localField: "productionId",
      foreignField: "_id",
      as: "production"
    }
  },
  {
    $unwind: "$production"
  },
  {
    $project: {
      _id: 1,
      role: 1,
      productionTitle: "$production.title",
      year: "$production.year",
      tmdbId: "$production.tmdbId"
    }
  },
  {
    $sort: {
      year: 1,
      productionTitle: 1
    }
  }
]);

// Collaborators for the selected crew member
credits.aggregate([
  {
    $match: {
      crewId: selectedCrew._id
    }
  },
  {
    $group: {
      _id: null,
      productionIds: { $addToSet: "$productionId" }
    }
  },
  {
    $lookup: {
      from: "credits",
      localField: "productionIds",
      foreignField: "productionId",
      as: "relatedCredits"
    }
  },
  {
    $unwind: "$relatedCredits"
  },
  {
    $match: {
      "relatedCredits.crewId": { $ne: selectedCrew._id }
    }
  },
  {
    $group: {
      _id: "$relatedCredits.crewId",
      collaborationCount: { $sum: 1 },
      sharedProductionIds: { $addToSet: "$relatedCredits.productionId" },
      roles: { $addToSet: "$relatedCredits.role" }
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
      crewId: "$crew._id",
      name: "$crew.name",
      primaryRole: "$crew.role",
      collaborationCount: 1,
      roles: 1,
      sharedProductions: {
        $map: {
          input: "$sharedProductions",
          as: "production",
          in: {
            _id: "$$production._id",
            title: "$$production.title",
            year: "$$production.year"
          }
        }
      }
    }
  },
  {
    $sort: {
      collaborationCount: -1,
      name: 1
    }
  }
]);

// Graph-style network data for the selected crew member
credits.aggregate([
  {
    $match: {
      crewId: selectedCrew._id
    }
  },
  {
    $group: {
      _id: null,
      productionIds: { $addToSet: "$productionId" }
    }
  },
  {
    $lookup: {
      from: "productions",
      localField: "productionIds",
      foreignField: "_id",
      as: "productions"
    }
  },
  {
    $lookup: {
      from: "credits",
      localField: "productionIds",
      foreignField: "productionId",
      as: "networkCredits"
    }
  },
  {
    $project: {
      _id: 0,
      productions: 1,
      networkCredits: 1
    }
  }
]);

// Top collaborators across the whole database
credits.aggregate([
  {
    $group: {
      _id: {
        productionId: "$productionId",
        crewId: "$crewId"
      },
      role: { $first: "$role" }
    }
  },
  {
    $lookup: {
      from: "credits",
      localField: "_id.productionId",
      foreignField: "productionId",
      as: "sameProductionCredits"
    }
  },
  {
    $unwind: "$sameProductionCredits"
  },
  {
    $match: {
      $expr: {
        $ne: ["$_id.crewId", "$sameProductionCredits.crewId"]
      }
    }
  },
  {
    $project: {
      pair: {
        $cond: [
          { $lt: ["$_id.crewId", "$sameProductionCredits.crewId"] },
          ["$_id.crewId", "$sameProductionCredits.crewId"],
          ["$sameProductionCredits.crewId", "$_id.crewId"]
        ]
      }
    }
  },
  {
    $group: {
      _id: "$pair",
      sharedCredits: { $sum: 1 }
    }
  },
  {
    $sort: {
      sharedCredits: -1
    }
  },
  {
    $limit: 10
  }
]);
