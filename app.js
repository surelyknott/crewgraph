const path = require("path");
const express = require("express");

const crewRoutes = require("./routes/crewRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const { errorHandler, notFoundHandler } = require("./utils/errors");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname), { index: false }));

app.get("/", (_req, res) => {
  res.json({
    name: "CrewGraph API",
    status: "ok"
  });
});

app.use("/connection", connectionRoutes);
app.use("/crew", crewRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
