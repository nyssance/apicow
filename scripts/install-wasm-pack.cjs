if (process.env.SKIP_WASM_BUILD === "1") {
  console.log("Using the committed WASM packages (SKIP_WASM_BUILD=1)");
  return;
}

const { execSync } = require("node:child_process");

const version = tryExecSync("wasm-pack --version");
if (version.startsWith("wasm-pack ")) {
  console.log("wasm-pack already installed");
  return;
}

console.log("Installing wasm-pack via cargo...");
execSync("cargo install wasm-pack --locked", { stdio: "inherit" });

function tryExecSync(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString("utf-8");
  } catch {
    return "";
  }
}
