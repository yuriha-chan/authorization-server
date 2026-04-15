#!/usr/bin/env node
/**
 * Agent Client Script
 *
 * Subcommands:
 *   init     - Generate keypair and save to ~/.auth/
 *   register - Register existing keypair with server
 *   request  - Connect WebSocket, send REST request, wait for approval
 *
 * Usage:
 *   node agent-client.js init
 *   node agent-client.js register [--name <name>] [--host <host>] [--port <port>]
 *   node agent-client.js request <type> <realm-spec> [--host <host>] [--port <port>]
 * 
 * Exit Codes:
 *   0 - Request approved
 *   1 - Request denied
 *   2 - Connection/Authentication/Error
 *   3 - Timeout
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const crypto = require('crypto');
const http = require('http');
const { exit } = require('process');

const AUTH_DIR = path.join(os.homedir(), '.auth');
const PRIVATE_KEY_FILE = path.join(AUTH_DIR, 'id');
const PUBLIC_KEY_FILE = path.join(AUTH_DIR, 'id.pub');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    exit(0);
  }
  
  if (command === 'init') {
    const options = {
      command: 'init',
      host: process.env.AGENT_HOST || 'localhost',
      port: process.env.AGENT_PORT || '8080',
      name: null
    };

    // Parse optional flags
    for (let i = 1; i < args.length; i++) {
      switch (args[i]) {
        case '--host':
        case '-h':
          options.host = args[++i];
          break;
        case '--port':
        case '-p':
          options.port = args[++i];
          break;
        case '--name':
        case '-n':
          options.name = args[++i];
          break;
      }
    }

    return options;
  }

  if (command === 'register') {
    const options = {
      command: 'register',
      host: process.env.AGENT_HOST || 'localhost',
      port: process.env.AGENT_PORT || '8080',
      name: null
    };

    // Parse optional flags
    for (let i = 1; i < args.length; i++) {
      switch (args[i]) {
        case '--host':
        case '-h':
          options.host = args[++i];
          break;
        case '--port':
        case '-p':
          options.port = args[++i];
          break;
        case '--name':
        case '-n':
          options.name = args[++i];
          break;
      }
    }

    return options;
  }
  
  if (command === 'list-grants') {
    const options = {
      command: 'list-grants',
      type: args[1],
      baseUrl: null,
      host: process.env.AGENT_HOST || 'localhost',
      port: process.env.AGENT_PORT || '8080',
    };

    // Find where flags start (either at index 2 if baseUrl is not a flag, or find first flag)
    let flagStartIndex = 2;
    if (args[2] && !args[2].startsWith('-')) {
      options.baseUrl = args[2];
      flagStartIndex = 3;
    }

    // Parse optional flags
    for (let i = flagStartIndex; i < args.length; i++) {
      switch (args[i]) {
        case '--host':
        case '-h':
          options.host = args[++i];
          break;
        case '--port':
        case '-p':
          options.port = args[++i];
          break;
      }
    }

    if (!options.type) {
      console.error('Error: type is required for list-grants command');
      printHelp();
      exit(2);
    }

    return options;
  }

   if (command === 'request') {
    const options = {
      command: 'request',
      grantApiName: args[1],
      key: args[2],
      repositorySpec: args[3],
      host: process.env.AGENT_HOST || 'localhost',
      port: process.env.AGENT_PORT || '8080',
      timeout: parseInt(process.env.TIMEOUT || '300000'),
    };

    // Parse optional flags
    for (let i = 4; i < args.length; i++) {
      switch (args[i]) {
        case '--host':
        case '-h':
          options.host = args[++i];
          break;
        case '--port':
        case '-p':
          options.port = args[++i];
          break;
        case '--timeout':
        case '-t':
          options.timeout = parseInt(args[++i]);
          break;
      }
    }

    if (!options.grantApiName || !options.key || !options.repositorySpec) {
      console.error('Error: grantApiName, key, and repository are required');
      printHelp();
      exit(2);
    }

    return options;
  }
  
  console.error(`Unknown command: ${command}`);
  printHelp();
  exit(2);
}

function printHelp() {
  console.log(`
Agent Client - Authentication Agent

Usage:
  agent-client init [options]                 Generate keypair and register agent
  agent-client register [options]             Register existing keypair with server
  agent-client list-grants <type> [baseUrl]  List available GrantAPIs
  agent-client request <grantApiName> <key> <repository[rw]>  Send request and wait for approval

Commands:
  init [options]
    Generate RSA keypair and register with server

    Options:
      -h, --host <host>      Agent server host (default: localhost)
      -p, --port <port>      Agent server port (default: 8080)
      -n, --name <name>      Agent unique name (default: auto-generated)

    Saves keys to:
      ~/.auth/id      (private key)
      ~/.auth/id.pub  (public key)

  register [options]
    Register existing keypair with server (use after 'init' if registration failed)

    Options:
      -h, --host <host>      Agent server host (default: localhost)
      -p, --port <port>      Agent server port (default: 8080)
      -n, --name <name>      Agent unique name (default: auto-generated)

  list-grants <type> [baseUrl] [options]
    List available GrantAPIs for a given type

    Arguments:
      type         Grant API type (e.g., github)
      baseUrl      Optional base URL filter

    Options:
      -h, --host <host>      Server host (default: localhost)
      -p, --port <port>      Server port (default: 8080)

  request <grantApiName> <key> <repository[rw]> [options]
    Connect via WebSocket, send REST request, wait for approval

    Arguments:
      grantApiName  Grant API name (e.g., github-main)
      key           Service access key
      repository    Repository with permissions: repo[rw]
                   Examples:
                     myrepo        (read-only)
                     myrepo[r]     (read-only)
                     myrepo[w]     (write-only)
                     myrepo[rw]    (read-write)

    Options:
      -h, --host <host>      Server host (default: localhost)
      -p, --port <port>      Server port (default: 8080)
      -t, --timeout <ms>     Timeout in milliseconds (default: 300000)

Environment Variables:
  AGENT_HOST                 Server host
  AGENT_PORT                 Server port
  TIMEOUT                    Timeout in milliseconds

Exit Codes:
  0                          Request approved / Init success
  1                          Request denied
  2                          Connection/Authentication/Error
  3                          Timeout
`);
}

// Ensure ~/.auth directory exists
function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { mode: 0o700 });
    console.log(`Created directory: ${AUTH_DIR}`);
  }
}

// Generate RSA keypair
function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

// Get fingerprint from public key
function getFingerprint(publicKey) {
  return crypto.createHash('sha256').update(publicKey).digest('hex');
}

// Sign data with private key
function signData(privateKey, data) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// Load keys from ~/.auth/
function loadKeys() {
  if (!fs.existsSync(PRIVATE_KEY_FILE) || !fs.existsSync(PUBLIC_KEY_FILE)) {
    console.error(`Error: Keys not found in ${AUTH_DIR}`);
    console.error(`Run 'agent-client init' first to generate keys`);
    exit(2);
  }
  
  const privateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf-8');
  const publicKey = fs.readFileSync(PUBLIC_KEY_FILE, 'utf-8');
  const fingerprint = getFingerprint(publicKey);
  
  return { privateKey, publicKey, fingerprint };
}

// Load key from file or use directly
function loadKey(keyOrFile) {
  if (!keyOrFile) {
    return null;
  }
  if (keyOrFile.startsWith('@')) {
    const filePath = keyOrFile.slice(1);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Key file not found: ${filePath}`);
      exit(2);
    }
    return fs.readFileSync(filePath, 'utf-8').trim();
  }
  if (fs.existsSync(keyOrFile)) {
    return fs.readFileSync(keyOrFile, 'utf-8').trim();
  }
  return keyOrFile;
}

// Parse repository spec: repo[r][w]
function parseRepositorySpec(spec) {
  const match = spec.match(/^([^\[]+)(?:\[([rw]+)\])?$/);
  if (!match) {
    console.error(`Error: Invalid repository spec format: ${spec}`);
    console.error(`Expected format: repository[rw]`);
    exit(2);
  }

  const [, repository, permissions] = match;
  const perms = permissions || 'r';

  return {
    repository,
    read: perms.includes('r') ? 1 : 0,
    write: perms.includes('w') ? 1 : 0
  };
}

// Register agent with server
async function registerAgent(host, port, uniqueName, publicKey) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      uniqueName,
      publicKey
    });
    
    const reqOptions = {
      hostname: host,
      port: port,
      path: '/api/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 201) {
            resolve(response);
          } else {
            reject(new Error(response.error || `HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

// Initialize command: generate keypair and register
async function cmdInit(options) {
  ensureAuthDir();

  if (fs.existsSync(PRIVATE_KEY_FILE) || fs.existsSync(PUBLIC_KEY_FILE)) {
    console.error('Error: Keys already exist');
    console.error(`  Private: ${PRIVATE_KEY_FILE}`);
    console.error(`  Public:  ${PUBLIC_KEY_FILE}`);
    console.error('Remove them first if you want to regenerate');
    exit(2);
  }

  console.log('Generating RSA keypair...');
  const { publicKey, privateKey } = generateKeyPair();
  const fingerprint = getFingerprint(publicKey);

  fs.writeFileSync(PRIVATE_KEY_FILE, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_FILE, publicKey, { mode: 0o644 });

  console.log('Keys generated successfully:');
  console.log(`  Private: ${PRIVATE_KEY_FILE}`);
  console.log(`  Public:  ${PUBLIC_KEY_FILE}`);
  console.log(`  Fingerprint: ${fingerprint}`);
  console.log('');

  // Generate default agent name if not provided
  const uniqueName = options.name || `agent-${os.hostname()}-${Date.now()}`;

  // Register with server
  console.log(`Registering agent '${uniqueName}' with ${options.host}:${options.port}...`);

  try {
    const result = await registerAgent(options.host, options.port, uniqueName, publicKey);
    console.log('Agent registered successfully:');
    console.log(`  ID:       ${result.id}`);
    console.log(`  Name:     ${result.uniqueName}`);
    console.log(`  State:    ${result.state}`);
  } catch (err) {
    console.error(`Registration failed: ${err.message}`);
    console.log('');
    console.log('Keys were generated but NOT registered. To register manually:');
    console.log(`  node agent-client.js register --name "${uniqueName}"`);
    exit(2);
  }
}

// Register command: register existing keypair with server
async function cmdRegister(options) {
  ensureAuthDir();

  // Load existing keys
  const keys = loadKeys();

  // Generate default agent name if not provided
  const uniqueName = options.name || `agent-${os.hostname()}-${Date.now()}`;

  // Register with server
  console.log(`Registering agent '${uniqueName}' with ${options.host}:${options.port}...`);

  try {
    const result = await registerAgent(options.host, options.port, uniqueName, keys.publicKey);
    console.log('Agent registered successfully:');
    console.log(`  ID:       ${result.id}`);
    console.log(`  Name:     ${result.uniqueName}`);
    console.log(`  State:    ${result.state}`);
  } catch (err) {
    console.error(`Registration failed: ${err.message}`);
    exit(2);
  }
}

// Send REST request to create authorization
async function sendRestRequest(options, keys, loadedKey, requestId) {
  return new Promise((resolve, reject) => {
    const realm = parseRepositorySpec(options.repositorySpec);
    const timestamp = Date.now();
    const body = {
      serviceAccessKey: loadedKey,
      realm,
      grantApi: options.grantApiName
    };
    const bodyString = JSON.stringify(body);
    const signature = signData(keys.privateKey, `${timestamp}${bodyString}`);

    const requestData = JSON.stringify(body);

    const reqOptions = {
      hostname: options.host,
      port: options.port,
      path: '/api/request-access',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-timestamp': timestamp,
        'x-fingerprint': keys.fingerprint
      }
    };

    console.log(`Sending REST request: ${options.grantApiName} ${options.repositorySpec}`);
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 202) {
            console.log(`Request created: ${response.requestId}`);
            resolve(response.requestId);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error || data}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

// List grants command: HTTP GET to /api/grant-apis
async function cmdListGrants(options) {
  const queryParams = new URLSearchParams();
  queryParams.append('type', options.type);
  if (options.baseUrl) {
    queryParams.append('baseUrl', options.baseUrl);
  }

  const queryString = queryParams.toString();
  const path = `/api/grant-apis${queryString ? '?' + queryString : ''}`;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: options.host,
      port: options.port,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    console.log(`Fetching GrantAPIs: type=${options.type}${options.baseUrl ? ', baseUrl=' + options.baseUrl : ''}`);

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            if (Array.isArray(response) && response.length === 0) {
              console.log('No GrantAPIs found matching the criteria.');
            } else {
              console.log(`Found ${response.length} GrantAPI(s):`);
              response.forEach((grant, index) => {
                console.log(`\n  [${index + 1}] ${grant.name}`);
                console.log(`      ID:          ${grant.id}`);
                console.log(`      Type:        ${grant.type}`);
                console.log(`      Base URL:    ${grant.baseURL}`);
                if (grant.description) {
                  console.log(`      Description: ${grant.description}`);
                }
              });
            }
            resolve(response);
          } else {
            const errorMsg = response.error || `HTTP ${res.statusCode}: ${data}`;
            console.error(`Error: ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        } catch (e) {
          const errorMsg = `Invalid response: ${data}`;
          console.error(`Error: ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });
    });

    req.on('error', (err) => {
      console.error(`Error: Failed to connect to server: ${err.message}`);
      reject(err);
    });
    req.end();
  });
}

// Request command: WebSocket + REST + Wait
async function cmdRequest(options) {
  const keys = loadKeys();
  const requestId = crypto.randomUUID();
  const loadedKey = loadKey(options.key);
  
  const wsUrl = `ws://${options.host}:${options.port}/api/agent/ws`;
  console.log(`Connecting to ${wsUrl}...`);
  
  const ws = new WebSocket(wsUrl);
  let timeoutId;
  let heartbeatInterval;
  let restRequestSent = false;
  
  // Set up timeout
  if (options.timeout > 0) {
    timeoutId = setTimeout(() => {
      console.error(`Timeout: No response received within ${options.timeout}ms`);
      ws.close();
      exit(3);
    }, options.timeout);
  }
  
  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('WebSocket connected, authenticating...');
      
      // Generate handshake data
      const timestamp = Date.now();
      const nonce = crypto.randomBytes(16).toString('base64');
      const dataToSign = `${timestamp}${nonce}`;
      const signature = signData(keys.privateKey, dataToSign);
      
      // Send handshake
      const handshake = {
        type: 'handshake',
        data: {
          fingerprint: keys.fingerprint,
          timestamp,
          signature,
          nonce
        }
      };
      
      ws.send(JSON.stringify(handshake));
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'handshake_ack':
            if (message.data?.status === 'success') {
              console.log(`Authenticated successfully`);
              
              // Start heartbeat
              heartbeatInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'heartbeat',
                    timestamp: Date.now()
                  }));
                }
              }, 30000);
              
              // Send REST request after successful auth
              if (!restRequestSent) {
                restRequestSent = true;
                try {
                  const pendingRequestId = await sendRestRequest(options, keys, loadedKey, requestId);
                  console.log(`Waiting for approval of request: ${pendingRequestId}`);
                } catch (err) {
                  console.error(`Sent request: ${JSON.stringify({options, keys, loadedKey, requestId})}`);
                  console.error(`Failed to send request: ${JSON.stringify(err.message)}`);
                  ws.close();
                  exit(2);
                }
              }
            } else {
              console.error(`Authentication failed: ${message.data?.error || 'Unknown error'}`);
              ws.close();
              exit(2);
            }
            break;
            
          case 'authorization_granted':
            clearTimeout(timeoutId);
            clearInterval(heartbeatInterval);
            console.log('');
            console.log('✓ Request APPROVED');
            console.log(`  Request ID:       ${message.data.requestId}`);
            console.log(`  Authorization ID: ${message.data.authorizationId}`);
            console.log(`  Realm:            ${message.data.realm?.repository || 'N/A'}`);
            if (message.data.grantResult?.token) {
              console.log(`  Token:            ${message.data.grantResult.token.substring(0, 20)}...`);
            }
            ws.close();
            exit(0);
            
          case 'authorization_denied':
            clearTimeout(timeoutId);
            clearInterval(heartbeatInterval);
            console.log('');
            console.log('✗ Request DENIED');
            console.log(`  Request ID: ${message.data.requestId}`);
            if (message.data.reason) {
              console.log(`  Reason: ${message.data.reason}`);
            }
            ws.close();
            exit(1);
            
          case 'pong':
            // Heartbeat response, ignore
            break;
            
          default:
            console.log(`Received: ${message.type}`, message.data);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeoutId);
      clearInterval(heartbeatInterval);
      console.error('WebSocket error:', error.message);
      exit(2);
    });
    
    ws.on('close', (code, reason) => {
      clearTimeout(timeoutId);
      clearInterval(heartbeatInterval);
      
      if (code !== 1000 && code !== 1005) {
        console.error(`Connection closed unexpectedly: ${code} ${reason}`);
        exit(2);
      }
    });
  });
}

// Main entry point
async function main() {
  const options = parseArgs();

  if (options.command === 'init') {
    await cmdInit(options);
  } else if (options.command === 'register') {
    await cmdRegister(options);
  } else if (options.command === 'list-grants') {
    await cmdListGrants(options);
  } else if (options.command === 'request') {
    await cmdRequest(options);
  }
}

// Run main
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    exit(2);
  });
}

// Export functions for testing
module.exports = {
  parseArgs,
  cmdListGrants
};
