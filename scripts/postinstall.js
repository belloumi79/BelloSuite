// postinstall.js - Only run prisma generate if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL found, running prisma generate...');
  require('child_process').execSync('npx prisma generate', { stdio: 'inherit' });
} else {
  console.log('DATABASE_URL not set, skipping prisma generate');
  console.log('Set DATABASE_URL in your environment to enable Prisma client generation');
}
