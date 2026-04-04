const { loginUser } = require('./src/app/(auth)/login/actions');

async function test() {
  console.log('Testing loginUser server action locally...');
  const result = await loginUser('belloumi.karim.professional@gmail.com', 'BelloSuite2026@');
  console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
