import semver from "semver";
import { execSync } from "child_process";

const requiredRange = ">=22.0.0 <23";
const current = process.version;

if (!semver.satisfies(current, requiredRange)) {
  console.error(
    `\nNode.js version ${current} is not supported.\nPlease use Node ${requiredRange}.\n`
  );
  try {
    execSync("nvm use 22", { stdio: "inherit" });
    console.log("\nSwitched to Node 22 using nvm.\n");
  } catch {
    console.log("\nPlease switch manually: nvm use 22\n");
  }
  process.exit(1);
} else {
  console.log(`Node version ${current} OK!`);
}
