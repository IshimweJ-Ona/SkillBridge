// Crash-isolation tuning shared by every SkillBridge service. Each app runs
// as its own PM2 process (autorestart: true), so a crash already can't take
// down the other 4 services. These extra settings stop a single genuinely
// broken service from crash-looping - which would otherwise burn CPU on the
// host and degrade the co-located services indirectly - by backing off
// restarts and giving up after repeated failures within a short window.
const restartTuning = {
  autorestart: true,
  min_uptime: '10s',
  max_restarts: 10,
  restart_delay: 2000,
  exp_backoff_restart_delay: 200,
};

module.exports = {
  apps: [
    {
      name: 'skillbridge-identity-api',
      script: 'dist/apps/identity-api/src/main.js',
      env: {
        SKILLBRIDGE_SERVICE: 'identity-api',
        PORT: 3101,
      },
      ...restartTuning,
    },
    {
      name: 'skillbridge-learning-api',
      script: 'dist/apps/learning-api/src/main.js',
      env: {
        SKILLBRIDGE_SERVICE: 'learning-api',
        PORT: 3102,
      },
      ...restartTuning,
    },
    {
      name: 'skillbridge-matching-api',
      script: 'dist/apps/matching-api/src/main.js',
      env: {
        SKILLBRIDGE_SERVICE: 'matching-api',
        PORT: 3103,
      },
      ...restartTuning,
    },
    {
      name: 'skillbridge-marketplace-api',
      script: 'dist/apps/marketplace-api/src/main.js',
      env: {
        SKILLBRIDGE_SERVICE: 'marketplace-api',
        PORT: 3104,
      },
      ...restartTuning,
    },
    {
      name: 'skillbridge-admin-api',
      script: 'dist/apps/admin-api/src/main.js',
      env: {
        SKILLBRIDGE_SERVICE: 'admin-api',
        PORT: 3105,
      },
      ...restartTuning,
    },
  ],
};
