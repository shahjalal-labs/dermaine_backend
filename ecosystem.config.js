module.exports = {
  apps: [
    {
      name: "main-server",
      script: "./dist/server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "reminder-worker",
      script: "./dist/jobs/workers/reminderWorker.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
