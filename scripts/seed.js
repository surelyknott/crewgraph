require("dotenv").config();

const mongoose = require("mongoose");

const Crew = require("../models/Crew");
const Production = require("../models/Production");
const Credit = require("../models/Credit");
const {
  generateCredits,
  generateCrewMembers,
  generateProductions
} = require("../utils/seedData");

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri || mongoUri.includes("<your MongoDB Atlas connection string>")) {
  console.error("Set MONGODB_URI in your environment variables or .env before running the seed script");
  process.exit(1);
}

const seedDatabase = async () => {
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  await Promise.all([
    Credit.deleteMany({}),
    Crew.deleteMany({}),
    Production.deleteMany({})
  ]);

  const crewMembers = await Crew.insertMany(generateCrewMembers(30));
  const productions = await Production.insertMany(generateProductions(15));
  const credits = generateCredits(crewMembers, productions);

  await Credit.insertMany(credits);

  console.log(`Seeded ${crewMembers.length} crew members`);
  console.log(`Seeded ${productions.length} productions`);
  console.log(`Seeded ${credits.length} credits`);
};

seedDatabase()
  .then(async () => {
    await mongoose.connection.close();
    console.log("Seeding complete");
  })
  .catch(async (err) => {
    console.error(err);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    process.exit(1);
  });
