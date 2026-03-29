import { seed } from './seed.js';

seed().then(()=>{
  console.log('Seed finished (CLI runner).');
  process.exit(0);
}).catch(err=>{
  console.error('Seed (CLI) failed:', err);
  process.exit(1);
});
