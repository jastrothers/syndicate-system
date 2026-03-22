import { spawn } from 'child_process';
import * as path from 'path';

async function testMCP() {
  console.log("Starting MCP evaluation test...");
  
  // Start the MCP process
  const mcpProcess = spawn('node', ['build/src/index.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  mcpProcess.stderr.on('data', (data) => {
    // Only log actual errors, ignore standard MCP initialization logging to stderr
    const msg = data.toString();
    if (msg.includes('error') || msg.includes('Error')) {
       console.error(`MCP Error: ${msg}`);
    }
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log("Timeout waiting for response.");
      mcpProcess.kill();
      resolve(false);
    }, 5000);

    mcpProcess.stdout.on('data', (data) => {
      const msgs = data.toString().split('\n').filter(l => l.trim() !== '');
      for(const msg of msgs) {
        try {
           const parsed = JSON.parse(msg);
           if (parsed.id === 1) {
              clearTimeout(timeout);
              mcpProcess.kill();
              console.log("Received valid JSON response:");
              console.log(JSON.stringify(parsed, null, 2));
              resolve(true);
           }
        } catch (e) {
            // Ignore non-JSON output
        }
      }
    });

    // Send a JSON-RPC request to read the rulebook we just created
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "get_rulebook",
        arguments: {
          gameId: "syndicate-heist"
        }
      }
    };
    
    console.log("Sending request...");
    mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

testMCP().then(() => console.log("Test finished.")).catch(console.error);
