module.exports = {
  apps: [
    {
      name: 'fit-blue',
      script: 'npm',
      args: 'run start:blue',
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '.env',
      },
    },
    {
      name: 'fit-green',
      script: 'npm',
      args: 'run start:green',
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '.env',
      },
    },
  ],
};
