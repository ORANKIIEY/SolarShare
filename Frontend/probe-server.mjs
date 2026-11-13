import http from "http";
import { spawn } from "child_process";

const PORT = 3005;

// Start next server
const serverProcess = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});

serverProcess.stdout.on("data", (d) => {
  // console.log("[Next STDOUT]:", d.toString());
});
serverProcess.stderr.on("data", (d) => {
  // console.error("[Next STDERR]:", d.toString());
});

// Wait for server to be ready
function waitForReady() {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${PORT}/`, (res) => {
        clearInterval(interval);
        resolve();
      });
      req.on("error", () => {});
    }, 200);
  });
}

function fetchRoute(path, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) {
      headers["Cookie"] = cookie;
    }
    const req = http.request(
      `http://localhost:${PORT}${path}`,
      { method: "GET", headers },
      (res) => {
        resolve({
          status: res.statusCode,
          location: res.headers["location"] || null,
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function run() {
  await waitForReady();
  console.log("Next.js Server Ready on port", PORT);
  console.log("=====================================================================");
  console.log("ISSUE #18 ROUTE PROTECTION VERIFICATION TEST");
  console.log("=====================================================================\n");

  const testCases = [
    { desc: "GET / (Root Page, Signed Out)", path: "/", cookie: null },
    { desc: "GET /solar (Investor Portal, Signed Out)", path: "/solar", cookie: null },
    { desc: "GET /solar/anything (Investor Subpath, Signed Out)", path: "/solar/anything", cookie: null },
    { desc: "GET /loginx (Unrecognized/Unprotected Route, Signed Out)", path: "/loginx", cookie: null },
    { desc: "GET /operator (Signed Out)", path: "/operator", cookie: null },
    {
      desc: "GET /operator (Signed In with Operator Role)",
      path: "/operator",
      cookie:
        "solarshare_token=demo-token-operator; solarshare_user=" +
        encodeURIComponent(JSON.stringify({ id: "0", name: "Operator", role: "operator" })),
    },
    {
      desc: "GET /operator (Signed In with Wrong Role: Investor)",
      path: "/operator",
      cookie:
        "solarshare_token=demo-token-investor; solarshare_user=" +
        encodeURIComponent(JSON.stringify({ id: "1", name: "Investor", role: "investor" })),
    },
  ];

  for (const tc of testCases) {
    const res = await fetchRoute(tc.path, tc.cookie);
    console.log(`Test: ${tc.desc}`);
    console.log(`  Path: ${tc.path}`);
    console.log(`  Status Code: ${res.status}`);
    if (res.location) {
      console.log(`  Location Header: ${res.location}`);
    }
    console.log();
  }

  serverProcess.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error("Error running test:", err);
  serverProcess.kill();
  process.exit(1);
});
