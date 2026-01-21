const fs = require("fs");
const path = require("path");

const VALID_BUMPS = new Set(["major", "minor", "patch"]);
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

const readPackageJson = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return { raw, data };
};

const writePackageJson = (filePath, data) => {
  const json = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, json, "utf8");
};

const bumpVersion = (version, bump) => {
  const match = VERSION_RE.exec(version);
  if (!match) {
    throw new Error(`Invalid version "${version}". Expected x.y.z`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (bump === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor += 1;
    patch = 0;
  } else if (bump === "patch") {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
};

const main = () => {
  const packagePath = path.join(__dirname, "..", "package.json");
  const { data } = readPackageJson(packagePath);

  const arg = process.argv[2] || "patch";

  if (VALID_BUMPS.has(arg)) {
    data.version = bumpVersion(data.version, arg);
  } else if (VERSION_RE.test(arg)) {
    data.version = arg;
  } else {
    throw new Error(
      `Usage: node scripts/bump-version.js [patch|minor|major|x.y.z] (got "${arg}")`
    );
  }

  writePackageJson(packagePath, data);
  console.log(`Version set to ${data.version}`);
};

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
