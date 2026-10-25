import app from "./app";
import config from "./src/config/index";
import { prisma } from "./src/lib/prisma";

const port = config.port || 3000;

async function main() {
  try {
    await prisma.$connect();
    console.log("Prisma Database connected successfully!");
    app.listen(port, () => {
      console.log(`Server is running on ${port}`);
    });
  } catch (error) {
    console.error("Error starting the server", error);
    await prisma.$disconnect();
  }
}

main();
