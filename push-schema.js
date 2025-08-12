const { spawn } = require('child_process');

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let hasResponded = false;

child.stdout.on('data', (data) => {
  output += data.toString();
  console.log(data.toString());
  
  // Auto-respond to prompts
  if (!hasResponded && output.includes('Is') && output.includes('enum created or renamed')) {
    console.log('Answering: + (create new)');
    child.stdin.write('+\n');
    hasResponded = true;
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});

// Safety timeout
setTimeout(() => {
  if (!hasResponded) {
    console.log('Sending newline to continue...');
    child.stdin.write('\n');
  }
}, 5000);
