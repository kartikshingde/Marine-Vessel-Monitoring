import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vessel from '../models/Vessel.js';

dotenv.config();

const vessels = [
  {
    name: 'SS Discovery',
    mmsi: '123456789',
    type: 'cargo',
    currentPosition: { latitude: 25.5, longitude: -165.3 },
    speed: 18,
    heading: 45,
    status: 'active',
  },
  {
    name: 'MV Explorer',
    mmsi: '987654321',
    type: 'tanker',
    currentPosition: { latitude: 30.2, longitude: -140.5 },
    speed: 22,
    heading: 90,
    status: 'active',
  },
  {
    name: 'HMS Navigator',
    mmsi: '456789123',
    type: 'passenger',
    currentPosition: { latitude: 1.35, longitude: 103.82 },
    speed: 0,
    heading: 180,
    status: 'docked',
  },
  {
    name: 'SS Voyager',
    mmsi: '321654987',
    type: 'cargo',
    currentPosition: { latitude: 10.5, longitude: 75.3 },
    speed: 20,
    heading: 270,
    status: 'active',
  },
];

const seedVessels = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    await Vessel.deleteMany({});
    console.log('🗑️  Cleared existing vessels');

    await Vessel.insertMany(vessels);
    console.log('✅ Seeded 4 vessels successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding vessels:', error);
    process.exit(1);
  }
};

seedVessels();
