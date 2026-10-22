const config = require("./config");
const { connectDb } = require("./db");
const { seedIfEmpty } = require("./seed");
const { createApp } = require("./app");

async function main() {
  await connectDb();
  console.log("Connected to MongoDB:", config.mongoUri.replace(/\/\/[^@]*@/, "//***@"));
  await seedIfEmpty();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Mediconnect running at http://localhost:${config.port}`);
  });

  const shutdown = () => server.close(() => require("mongoose").disconnect().then(() => process.exit(0)));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(err => {
  console.error("Failed to start:", err.message);
  if (/ECONNREFUSED|ServerSelection/i.test(err.message)) {
    console.error("Could not reach MongoDB. Is mongod running, and is MONGODB_URI correct?");
  }
  process.exit(1);
});
