import mongoose from 'mongoose';
import trip from './src/models/schemas/trips.js';


const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB...');

    // Clear existing trips
    console.log('Cleared existing trips.');

    // Insert new trips
    await trip.create([
      {
        id: "trip1",
        name: "Sakura Valley",
        description: "A beautiful trip through the cherry blossoms.",
        startStation: "Tokyo",
        endStation: "Kyoto",
        duration: 120,
        price: 150,
        region: "Kanto",
        distance: 500,
        bestSeason: "spring",
        highlights: ["Cherry Blossoms", "Mount Fuji View"]
      },
      {
        id: "trip2",
        name: "Alpine Panorama",
        description: "Scenic views of the Japanese Alps.",
        startStation: "Nagoya",
        endStation: "Matsumoto",
        duration: 90,
        price: 120,
        region: "Chubu",
        distance: 300,
        bestSeason: "autumn",
        highlights: ["Snow-capped peaks", "Hot springs"]
      }
    ]);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();