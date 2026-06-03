const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const rootDir = __dirname;
const isWindows = process.platform === "win32";
const commandShell = process.env.ComSpec || "cmd.exe";
const lockFilePath = path.join(rootDir, ".workspace-run.lock.json");
const runtimeFilePath = path.join(rootDir, ".workspace-runtime.json");
let isShuttingDown = false;
let processes = [];

function isProcessRunning(pid) {
  if (!pid || !Number.isInteger(pid)) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function releaseWorkspaceLock() {
  const lock = readJsonFile(lockFilePath);
  if (lock?.pid === process.pid && fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
  }

  if (fs.existsSync(runtimeFilePath)) {
    fs.unlinkSync(runtimeFilePath);
  }
}

function acquireWorkspaceLock() {
  const lock = readJsonFile(lockFilePath);
  if (lock?.pid && isProcessRunning(lock.pid) && lock.pid !== process.pid) {
    throw new Error(`Workspace is already running with PID ${lock.pid}. Stop the current window before starting another one.`);
  }

  writeJsonFile(lockFilePath, {
    pid: process.pid,
    createdAt: new Date().toISOString(),
    cwd: rootDir
  });
}

function shutdown(code = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  releaseWorkspaceLock();

  process.exit(code);
}

function runProcess(name, cwd, args, extraEnv = {}) {
  const command = isWindows ? [commandShell, ["/d", "/s", "/c", `npm ${args.join(" ")}`]] : ["npm", args];
  const child = spawn(command[0], command[1], {
    cwd,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: "inherit",
    shell: false
  });

  child.on("exit", code => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code || 1);
    }
  });

  child.on("error", error => {
    console.error(`Failed to start ${name}:`, error.message);
    shutdown(1);
  });

  return child;
}

function isPortFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    // Match Express' default behavior on Windows by probing the port on all interfaces.
    server.listen(port);
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;

  while (!(await isPortFree(port))) {
    port += 1;
  }

  return port;
}

async function main() {
  acquireWorkspaceLock();

  const serverPort = await findAvailablePort(3001);
  let clientPort = await findAvailablePort(3000);
  if (clientPort === serverPort) {
    clientPort = await findAvailablePort(serverPort + 1);
  }
  const apiOrigin = `http://localhost:${serverPort}`;

  console.log(`Starting server on ${serverPort}`);
  console.log(`Starting client on ${clientPort}`);

  writeJsonFile(runtimeFilePath, {
    pid: process.pid,
    serverPort,
    clientPort,
    startedAt: new Date().toISOString()
  });

  processes = [
    runProcess("server", path.join(rootDir, "server"), ["run", "start"], {
      PORT: String(serverPort)
    }),
    runProcess("client", path.join(rootDir, "client"), ["run", "dev", "--", "--port", String(clientPort)], {
      CRM_API_ORIGIN: apiOrigin
    })
  ];
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch(error => {
  console.error("Failed to start workspace:", error.message);
  shutdown(1);
});
