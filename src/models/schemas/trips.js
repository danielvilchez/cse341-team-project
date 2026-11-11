import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    startStation: { type: String, required: true, trim: true },
    endStation: { type: String, required: true, trim: true },
    duration: { type: Number, required: true, min: 0 },
    price: { type: Number, required: false, min: 0 },
    region: { type: String, required: false, trim: true },
    distance: { type: Number, required: false, min: 0 },
    bestSeason: { type: String, required: false, trim: true },
    highlights: { type: [String], required: false }
  },
  {
    timestamps: true,
  }
);

const trip = mongoose.model("Trip", tripSchema);

export default trip;