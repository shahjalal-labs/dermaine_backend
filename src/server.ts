import { Server } from "http";
import app from "./app";
import config from "./config";
import { seedAvailability } from "./app/modules/availability/availability.service";
import { seedConsultationFees } from "./app/modules/consultation/consultation.service";

async function main() {
  const server: Server = app.listen(config.port, () => {
    seedAvailability();
    seedConsultationFees();
    console.log("✅ Server is running on port", config.port);
  });

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed!");
      });
    }
    process.exit(1);
  };
  process.on("uncaughtException", (error) => {
    console.log(error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.log(error);
    exitHandler();
  });
}

// In serverless environments like Vercel, do not call listen(); export app as request handler
if (!process.env.VERCEL) {
  main();
}

export default app;
