import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceScript = path.join(projectRoot, "scripts", "baota-update.sh");
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function writeExecutable(file, contents) {
  await writeFile(file, contents, "utf8");
  await chmod(file, 0o755);
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "weread-baota-update-"));
  temporaryDirectories.push(root);

  const scriptsDirectory = path.join(root, "scripts");
  const fakeBinDirectory = path.join(root, "fake-bin");
  const commandLog = path.join(root, "commands.log");

  await mkdir(scriptsDirectory, { recursive: true });
  await mkdir(fakeBinDirectory, { recursive: true });
  await mkdir(path.join(root, ".git"));
  await cp(sourceScript, path.join(scriptsDirectory, "baota-update.sh"));
  await writeFile(path.join(root, "package.json"), "{}\n", "utf8");
  await writeFile(commandLog, "", "utf8");

  await writeExecutable(
    path.join(fakeBinDirectory, "git"),
    `#!/usr/bin/env bash
printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
case "$1" in
  status)
    printf '%s' "\${FAKE_GIT_STATUS:-}"
    ;;
  branch)
    printf '%s\\n' "\${FAKE_GIT_BRANCH:-main}"
    ;;
  rev-parse)
    printf '%s\\n' "\${FAKE_GIT_COMMIT:-abc1234}"
    ;;
  pull)
    exit "\${FAKE_GIT_PULL_EXIT:-0}"
    ;;
esac
`,
  );

  await writeExecutable(
    path.join(fakeBinDirectory, "node"),
    `#!/usr/bin/env bash
printf 'node %s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$1" == "--version" ]]; then
  printf '%s\\n' "\${FAKE_NODE_VERSION:-v24.18.0}"
fi
`,
  );

  await writeExecutable(
    path.join(fakeBinDirectory, "npm"),
    `#!/usr/bin/env bash
printf 'npm %s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$1" == "--version" ]]; then
  printf '%s\\n' "\${FAKE_NPM_VERSION:-11.16.0}"
  exit 0
fi
if [[ "$1" == "ci" ]]; then
  exit "\${FAKE_NPM_CI_EXIT:-0}"
fi
if [[ "$1" == "run" && "$2" == "build" ]]; then
  if [[ "\${FAKE_NPM_BUILD_EXIT:-0}" != "0" ]]; then
    exit "$FAKE_NPM_BUILD_EXIT"
  fi
  mkdir -p "$PWD/dist/client" "$PWD/dist/server"
  : > "$PWD/dist/server/index.js"
  exit 0
fi
`,
  );

  return { commandLog, fakeBinDirectory, root };
}

function runUpdate({ commandLog, fakeBinDirectory, root }, extraEnvironment = {}) {
  return spawnSync("bash", [path.join(root, "scripts", "baota-update.sh")], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      COMMAND_LOG: commandLog,
      PATH: `${fakeBinDirectory}:${process.env.PATH}`,
      ...extraEnvironment,
    },
  });
}

test("updates a clean main checkout and builds production assets", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /更新构建完成/);
  assert.match(result.stdout, /宝塔面板.*重启/);

  const commandLog = await readFile(fixture.commandLog, "utf8");
  assert.match(commandLog, /git pull --ff-only origin main/);
  assert.match(commandLog, /npm ci/);
  assert.match(commandLog, /npm run build/);
  assert.match(
    await readFile(path.join(fixture.root, "scripts", "baota-update.sh"), "utf8"),
    /git pull --ff-only/,
  );
});

test("refuses to update a checkout with local changes", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture, { FAKE_GIT_STATUS: " M package.json\n" });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /存在未提交修改/);

  const commandLog = await readFile(fixture.commandLog, "utf8");
  assert.doesNotMatch(commandLog, /git pull/);
  assert.doesNotMatch(commandLog, /npm ci/);
});

test("rejects unsupported odd-numbered Node releases", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture, { FAKE_NODE_VERSION: "v23.10.0" });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}${result.stderr}`,
    /Node\.js 22\.13\+ LTS 或 24 LTS/,
  );

  const commandLog = await readFile(fixture.commandLog, "utf8");
  assert.doesNotMatch(commandLog, /git pull/);
});

test("accepts the Node 22.13 LTS compatibility boundary", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture, { FAKE_NODE_VERSION: "v22.13.0" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /更新构建完成/);
});

test("stops before dependency installation when fast-forward pull fails", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture, { FAKE_GIT_PULL_EXIT: "7" });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /更新失败/);

  const commandLog = await readFile(fixture.commandLog, "utf8");
  assert.doesNotMatch(commandLog, /npm ci/);
  assert.doesNotMatch(commandLog, /npm run build/);
});

test("stops without reporting success when the production build fails", async () => {
  const fixture = await createFixture();
  const result = runUpdate(fixture, { FAKE_NPM_BUILD_EXIT: "9" });

  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stdout, /更新构建完成/);
  assert.match(`${result.stdout}${result.stderr}`, /更新失败/);
});
