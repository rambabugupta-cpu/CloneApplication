import { spawn } from 'child_process';

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Handle any prompts by saying yes to create sessions table
setTimeout(() => {
  child.stdin.write('y\n');
}, 1000);

child.on('close', (code) => {
  process.exit(code);
});