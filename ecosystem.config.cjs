module.exports = {
  apps: [
    {
      name: 'fit-blue',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        ENV_FILE: '.env',
      },
    },
    {
      name: 'fit-green',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        ENV_FILE: '.env',
      },
    },
  ],
};
