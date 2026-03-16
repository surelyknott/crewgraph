const mongoose = require("mongoose");

const creditSchema = new mongoose.Schema({
  crewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Crew",
    required: true
  },
  productionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Production",
    required: true
  },
  role: {
    type: String,
    required: true,
    trim: true
  }
});

creditSchema.index({ crewId: 1, productionId: 1 });

module.exports = mongoose.model("Credit", creditSchema);
