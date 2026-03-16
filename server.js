require("dotenv").config();

const mongoose = require("mongoose");

const app = require("./app");

const PORT = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri || mongoUri.includes("<your MongoDB Atlas connection string>")) {
  console.error("Set MONGODB_URI in your environment variables or .env before starting the server");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
