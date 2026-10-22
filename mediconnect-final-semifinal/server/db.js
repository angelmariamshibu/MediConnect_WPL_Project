const mongoose = require("mongoose");
const config = require("./config");

async function connectDb(uri = config.mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  await Promise.all(Object.values(mongoose.models).map(m => m.init()));
  return mongoose.connection;
}

module.exports = { connectDb };
