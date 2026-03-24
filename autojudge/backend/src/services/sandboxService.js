// This file drives the sandboxService feature flow and keeps the behavior easy to reason about.
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const os = require("os");
const AdmZip = require("adm-zip");

const LANG_CONFIG = {
  cpp: { ext: "cpp", compile: (f) => `g++ -O2 -o ${f}.out ${f}.cpp`, run: (f, input, timeoutSec = 5) => `echo "${input}" | timeout ${timeoutSec} ${f}.out`, compiled: true },
  c:   { ext: "c",   compile: (f) => `gcc -O2 -o ${f}.out ${f}.c`,   run: (f, input, timeoutSec = 5) => `echo "${input}" | timeout ${timeoutSec} ${f}.out`, compiled: true },
  python: { ext: "py", run: (f, input, timeoutSec = 5) => `echo "${input}" | timeout ${timeoutSec} python3 ${f}.py`, compiled: false },
  java: { ext: "java", compile: (f, cls) => `javac ${f}.java`, run: (f, cls, input, timeoutSec = 10) => `echo "${input}" | timeout ${timeoutSec} java -cp ${path.dirname(f)} ${cls}`, compiled: true },
  javascript: { ext: "js", run: (f, input, timeoutSec = 5) => `echo "${input}" | timeout ${timeoutSec} node ${f}.js`, compiled: false }
};

const execPromise = (cmd, timeoutMs = 10000, options = {}) => new Promise((resolve) => {
  exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024, cwd: options.cwd }, (err, stdout, stderr) => {
    if (err && err.killed) resolve({ stdout: "", stderr: "TIME_LIMIT_EXCEEDED", timedOut: true });
    else resolve({ stdout: stdout || "", stderr: stderr || "", exitCode: err ? err.code : 0 });
  });
});

// walkFiles handles one focused part of this file's workflow.
const walkFiles = (root) => {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "__MACOSX" || e.name === ".DS_Store" || e.name === "thumbs.db") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
};

// toShellPath handles one focused part of this file's workflow.
const toShellPath = (p) => p.replace(/\\/g, "/");
// q handles one focused part of this file's workflow.
const q = (value) => `"${String(value)
  .replace(/[\r\n]/g, "")
  .replace(/(["\\$`])/g, "\\$1")}"`;
// sanitizeInput handles one focused part of this file's workflow.
const sanitizeInput = (value) => String(value || "").replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");

// resolveSafeZipPath handles one focused part of this file's workflow.
const resolveSafeZipPath = (rootDir, entryName) => {
  const normalized = String(entryName || "").replace(/\\/g, "/").replace(/^\/+/, "");
  // Quick guard clause so we fail fast before doing heavier work.
  if (!normalized || normalized.includes("\0")) return null;
  const targetPath = path.resolve(rootDir, normalized);
  const basePath = path.resolve(rootDir);
  // Quick guard clause so we fail fast before doing heavier work.
  if (targetPath !== basePath && !targetPath.startsWith(basePath + path.sep)) return null;
  return targetPath;
};

const extractZipSafely = (zipPath, destinationDir, options = {}) => {
  const maxEntries = options.maxEntries || 5000;
  const maxTotalSize = options.maxTotalSize || 50 * 1024 * 1024;

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  if (entries.length > maxEntries) {
    throw new Error("Archive contains too many files");
  }

  let totalExtractedBytes = 0;
  for (const entry of entries) {
    const targetPath = resolveSafeZipPath(destinationDir, entry.entryName);
    if (!targetPath) {
      throw new Error("Archive contains unsafe file path");
    }

    if (entry.entryName.includes("__MACOSX") || entry.entryName.includes(".DS_Store")) {
      continue;
    }

    if (entry.isDirectory) {
      fs.mkdirSync(targetPath, { recursive: true });
      continue;
    }

    totalExtractedBytes += entry.header.size || 0;
    if (totalExtractedBytes > maxTotalSize) {
      throw new Error("Archive is too large to extract safely");
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, entry.getData());
  }
};

const computeAdaptiveTimeLimit = (rawInput, baseMs = 5000) => {
  const safeBase = Number.isFinite(baseMs) ? Math.max(2000, baseMs) : 5000;
  const inputText = String(rawInput || "").trim();
  // Quick guard clause so we fail fast before doing heavier work.
  if (!inputText) return safeBase;

  const tokenCount = inputText.split(/\s+/).length;
  const maybeN = parseInt(inputText.split(/\s+/)[0], 10);

  let boosted = safeBase;
  if (tokenCount > 50000) boosted = Math.max(boosted, 120000);
  else if (tokenCount > 20000) boosted = Math.max(boosted, 60000);
  else if (tokenCount > 8000) boosted = Math.max(boosted, 30000);

  if (Number.isFinite(maybeN)) {
    if (maybeN >= 700) boosted = Math.max(boosted, 120000);
    else if (maybeN >= 400) boosted = Math.max(boosted, 60000);
    else if (maybeN >= 250) boosted = Math.max(boosted, 30000);
  }

  return Math.min(boosted, 600000);
};

// detectGTestProject handles one focused part of this file's workflow.
const detectGTestProject = (files) => {
  const patterns = [/gtest\/gtest\.h/, /\bTEST(_F|_P)?\s*\(/, /\bRUN_ALL_TESTS\s*\(/];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (![".cpp", ".cc", ".cxx", ".hpp", ".h"].includes(ext)) continue;
    // Wrap this block to return a clean API/UI error path if anything fails.
    try {
      const content = fs.readFileSync(file, "utf-8");
      // Quick guard clause so we fail fast before doing heavier work.
      if (patterns.some((re) => re.test(content))) return true;
    } catch (e) {
      // Ignore unreadable files while scanning
    }
  }
  return false;
};

/**
 * parseGTestOutput parses Google Test stdout into structured per-test results.
 * @param {string} output - Raw stdout from GTest binary
 * @returns {{ summary: {total:number, passed:number, failed:number, duration:number}, tests: Array }}
 */
const parseGTestOutput = (output) => {
  const lines = (output || '').split('\n');
  const tests = [];
  let currentSuite = '';
  let currentTest = null;
  let failureLines = [];

  for (const line of lines) {
    const suiteMatch = line.match(/^\[----------\] \d+ tests? from (.+)$/);
    if (suiteMatch) { currentSuite = suiteMatch[1]; continue; }

    const testStartMatch = line.match(/^\[ RUN      \] (.+)\.(.+)$/);
    if (testStartMatch) {
      currentTest = { suite: testStartMatch[1], name: testStartMatch[2], status: 'RUNNING', duration: 0, failure_message: '' };
      failureLines = [];
      continue;
    }

    const testOkMatch = line.match(/^\[       OK \] (.+)\.(.+) \((\d+) ms\)$/);
    if (testOkMatch && currentTest) {
      currentTest.status = 'PASSED';
      currentTest.duration = parseInt(testOkMatch[3], 10);
      currentTest.failure_message = '';
      tests.push({ ...currentTest });
      currentTest = null;
      failureLines = [];
      continue;
    }

    const testFailMatch = line.match(/^\[  FAILED  \] (.+)\.(.+)(?: \((\d+) ms\))?$/);
    if (testFailMatch && currentTest) {
      currentTest.status = 'FAILED';
      currentTest.duration = parseInt(testFailMatch[3] || '0', 10);
      currentTest.failure_message = failureLines.join('\n').trim();
      tests.push({ ...currentTest });
      currentTest = null;
      failureLines = [];
      continue;
    }

    // Collect failure detail lines (not status lines)
    if (currentTest && !line.startsWith('[')) {
      failureLines.push(line);
    }
  }

  const passed = tests.filter(t => t.status === 'PASSED').length;
  const failed = tests.filter(t => t.status === 'FAILED').length;
  const totalDurationMatch = output.match(/\[==========\] .+ \((\d+) ms total\)/);
  const duration = totalDurationMatch ? parseInt(totalDurationMatch[1], 10) : 0;

  return { summary: { total: tests.length, passed, failed, duration }, tests };
};

exports.runCode = async (code, language, testCases) => {
  const tmpDir = path.join(os.tmpdir(), `aj_${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const lang = LANG_CONFIG[language];
  if (!lang) throw new Error("Unsupported language");

  const className = language === "java" ? (code.match(/public\s+class\s+(\w+)/) || ["", "Main"])[1] : "Main";
  const filePath = path.join(tmpDir, language === "java" ? `${className}` : `code`);
  const srcFile = `${filePath}.${lang.ext}`;
  fs.writeFileSync(srcFile, code);

  const results = [];
  let compileError = null;

  // Compile if needed
  if (lang.compiled) {
    const compileCmd = lang.compile(filePath, className);
    const { stderr, exitCode } = await execPromise(compileCmd, 15000);
    if (exitCode !== 0) {
      compileError = stderr;
      // Return CE for all test cases
      return testCases.map(tc => ({
        testCaseId: tc._id,
        type: tc.type,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: "",
        verdict: "CE",
        executionTime: 0,
        memoryUsed: 0,
        points: 0,
        errorMessage: stderr.substring(0, 500)
      }));
    }
  }

  // Run each test case
  for (const tc of testCases) {
    const start = Date.now();
    const safeInput = tc.input.replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");
    const adaptiveLimit = computeAdaptiveTimeLimit(tc.input, tc.timeLimit || 5000);
    const timeoutSec = Math.max(2, Math.ceil((adaptiveLimit + 1500) / 1000));
    let runCmd;
    if (language === "java") runCmd = lang.run(filePath, className, safeInput, timeoutSec);
    else runCmd = lang.run(filePath, safeInput, timeoutSec);

    const { stdout, stderr, timedOut } = await execPromise(runCmd, adaptiveLimit + 2000);
    const execTime = Date.now() - start;
    const actual = stdout.trim();
    const expected = tc.expectedOutput.trim();

    let verdict = "WA";
    if (timedOut) verdict = "TLE";
    else if (stderr && !stdout) verdict = "RE";
    else if (actual === expected) verdict = "AC";

    results.push({
      testCaseId: tc._id,
      type: tc.type || "basic",
      input: tc.input,
      expectedOutput: expected,
      actualOutput: actual,
      verdict,
      executionTime: execTime,
      memoryUsed: 0,
      points: verdict === "AC" ? (tc.points || 1) : 0,
      errorMessage: verdict === "RE" ? stderr.substring(0, 200) : ""
    });
  }

  // Cleanup
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}
  return results;
};

exports.runWithInput = async (code, language, input = "", timeLimit = 5000) => {
  const tmpDir = path.join(os.tmpdir(), `aj_${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const lang = LANG_CONFIG[language];
  if (!lang) throw new Error("Unsupported language");

  const className = language === "java" ? (code.match(/public\s+class\s+(\w+)/) || ["", "Main"])[1] : "Main";
  const filePath = path.join(tmpDir, language === "java" ? `${className}` : "code");
  const srcFile = `${filePath}.${lang.ext}`;
  fs.writeFileSync(srcFile, code);

  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    if (lang.compiled) {
      const compileCmd = lang.compile(filePath, className);
      const { stderr, exitCode } = await execPromise(compileCmd, 15000);
      // Guard branch for invalid state or input.
      if (exitCode !== 0) {
        return {
          verdict: "CE",
          output: "",
          executionTime: 0,
          errorMessage: (stderr || "Compilation failed").substring(0, 500)
        };
      }
    }

    const effectiveTimeLimit = computeAdaptiveTimeLimit(input, timeLimit);
    const timeoutSec = Math.max(2, Math.ceil((effectiveTimeLimit + 1500) / 1000));
    const safeInput = String(input).replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");
    const start = Date.now();
    const runCmd = language === "java" ? lang.run(filePath, className, safeInput, timeoutSec) : lang.run(filePath, safeInput, timeoutSec);
    const { stdout, stderr, timedOut } = await execPromise(runCmd, effectiveTimeLimit + 2000);
    const executionTime = Date.now() - start;

    // Guard branch for invalid state or input.
    if (timedOut) {
      return { verdict: "TLE", output: "", executionTime, errorMessage: `Time limit exceeded (${Math.round(effectiveTimeLimit / 1000)}s)` };
    }

    // Guard branch for invalid state or input.
    if (stderr && !stdout) {
      return {
        verdict: "RE",
        output: "",
        executionTime,
        errorMessage: stderr.substring(0, 500)
      };
    }

    return {
      verdict: "AC",
      output: (stdout || "").trim(),
      executionTime,
      errorMessage: stderr ? stderr.substring(0, 500) : ""
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}
  }
};

exports.runProjectFromZip = async (zipPath, language, input = "", timeLimit = 5000, entryFile = "") => {
  const tmpDir = path.join(os.tmpdir(), `aj_proj_${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const zip = new AdmZip(zipPath);
    extractZipSafely(zipPath, tmpDir);

    const allFiles = walkFiles(tmpDir);
    const extMap = {
      cpp: [".cpp", ".cc", ".cxx"],
      c: [".c"],
      java: [".java"],
      python: [".py"],
      javascript: [".js"]
    };

    const sourceExts = extMap[language];
    if (!sourceExts) throw new Error("Unsupported language");

    const sourceFiles = allFiles.filter((f) => sourceExts.includes(path.extname(f).toLowerCase()));
    // Guard branch for invalid state or input.
    if (sourceFiles.length === 0) {
      return { verdict: "CE", output: "", executionTime: 0, errorMessage: `No ${language} source files found in zip`, isGTest: false };
    }

    const isGTest = language === "cpp" && detectGTestProject(allFiles);

    // normalizePath handles one focused part of this file's workflow.
    const normalizePath = (name) => String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
    // resolveSourcePath handles one focused part of this file's workflow.
    const resolveSourcePath = (name) => {
      const normalizedName = normalizePath(name);
      // Quick guard clause so we fail fast before doing heavier work.
      if (!normalizedName) return null;
      return sourceFiles.find((f) => {
        const rel = toShellPath(path.relative(tmpDir, f));
        return rel === normalizedName || path.basename(f) === normalizedName;
      }) || null;
    };

    // fileHasMain handles one focused part of this file's workflow.
    const fileHasMain = (filePath) => {
      // Wrap this block to return a clean API/UI error path if anything fails.
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        // Quick guard clause so we fail fast before doing heavier work.
        if (language === "cpp" || language === "c") return /\bint\s+main\s*\(/.test(content);
        // Quick guard clause so we fail fast before doing heavier work.
        if (language === "java") return /public\s+static\s+void\s+main\s*\(/.test(content);
      } catch (e) {
        return false;
      }
      return false;
    };

    const mainSourceFiles = sourceFiles.filter((f) => fileHasMain(f));
    const selectedEntrySource = resolveSourcePath(entryFile);

    let compileSourceFiles = sourceFiles;
    if ((language === "cpp" || language === "c") && mainSourceFiles.length > 1) {
      // Guard branch for invalid state or input.
      if (!selectedEntrySource) {
        return {
          verdict: "CE",
          output: "",
          executionTime: 0,
          errorMessage: `Multiple main files detected: ${mainSourceFiles.map((f) => toShellPath(path.relative(tmpDir, f))).join(", ")}. Select an entry file to run.`,
          isGTest
        };
      }

      const mainSet = new Set(mainSourceFiles);
      compileSourceFiles = sourceFiles.filter((f) => f === selectedEntrySource || !mainSet.has(f));
    }

    const relSources = compileSourceFiles.map((f) => q(toShellPath(path.relative(tmpDir, f))));

    // resolveInputFilePath handles one focused part of this file's workflow.
    const resolveInputFilePath = (name) => {
      const normalizedName = normalizePath(name);
      return allFiles.find((f) => {
        const rel = toShellPath(path.relative(tmpDir, f));
        return rel === normalizedName || path.basename(f) === normalizedName;
      });
    };

    // Support input from file:
    // - @path/to/file.txt -> one file
    // - @@fileA.txt||fileB.txt -> combine multiple files in order
    let actualInput = input;
    if (typeof input === "string" && input.startsWith("@@")) {
      const inputFileNames = input.substring(2).split("||").map((x) => x.trim()).filter(Boolean);
      const chunks = [];
      for (const fileName of inputFileNames) {
        const inputFilePath = resolveInputFilePath(fileName);
        if (inputFilePath) {
          // Wrap this block to return a clean API/UI error path if anything fails.
          try {
            chunks.push(fs.readFileSync(inputFilePath, "utf-8"));
          } catch (e) {
            chunks.push("");
          }
        }
      }
      actualInput = chunks.join("\n");
    } else if (typeof input === "string" && input.startsWith("@")) {
      const inputFileName = input.substring(1).trim();
      const inputFilePath = resolveInputFilePath(inputFileName);
      if (inputFilePath) {
        // Wrap this block to return a clean API/UI error path if anything fails.
        try {
          actualInput = fs.readFileSync(inputFilePath, "utf-8");
        } catch (e) {
          actualInput = "";
        }
      }
    }

    let runCmd = "";
    let compileCmd = "";
    const effectiveTimeLimit = computeAdaptiveTimeLimit(actualInput, timeLimit);
    const timeoutSec = Math.max(2, Math.ceil((effectiveTimeLimit + 3000) / 1000));

    if (language === "cpp") {
      const includeDirs = Array.from(new Set(
        allFiles
          .filter((f) => {
            const ext = path.extname(f).toLowerCase();
            return [".h", ".hpp", ".hh", ".hxx", ".cpp", ".cc", ".cxx"].includes(ext);
          })
          .map((f) => path.dirname(f))
      ));
      const includeFlags = includeDirs.map((d) => `-I${q(toShellPath(path.relative(tmpDir, d) || "."))}`).join(" ");

      compileCmd = `g++ -std=c++17 -O2 ${includeFlags} ${relSources.join(" ")} -o main.out${isGTest ? " -lgtest -lgtest_main -pthread" : ""}`;
      runCmd = isGTest
        ? `timeout ${timeoutSec} ./main.out`
        : `echo ${q(sanitizeInput(actualInput))} | timeout ${timeoutSec} ./main.out`;
    } else if (language === "c") {
      const includeDirs = Array.from(new Set(
        allFiles
          .filter((f) => {
            const ext = path.extname(f).toLowerCase();
            return [".h", ".c"].includes(ext);
          })
          .map((f) => path.dirname(f))
      ));
      const includeFlags = includeDirs.map((d) => `-I${q(toShellPath(path.relative(tmpDir, d) || "."))}`).join(" ");

      compileCmd = `gcc -O2 ${includeFlags} ${relSources.join(" ")} -o main.out`;
      runCmd = `echo ${q(sanitizeInput(actualInput))} | timeout ${timeoutSec} ./main.out`;
    } else if (language === "java") {
      compileCmd = `javac ${relSources.join(" ")}`;
      const javaMainFile = selectedEntrySource || sourceFiles.find((file) => {
        // Wrap this block to return a clean API/UI error path if anything fails.
        try {
          const content = fs.readFileSync(file, "utf-8");
          return /public\s+static\s+void\s+main\s*\(/.test(content);
        } catch (e) {
          return false;
        }
      }) || sourceFiles[0];
      const mainClass = path.basename(javaMainFile, ".java");
      runCmd = `echo ${q(sanitizeInput(actualInput))} | timeout ${timeoutSec} java -cp . ${mainClass}`;
    } else if (language === "python") {
      const mainPy = sourceFiles.find((f) => path.basename(f).toLowerCase() === "main.py") || sourceFiles[0];
      runCmd = `echo ${q(sanitizeInput(actualInput))} | timeout ${timeoutSec} python3 ${q(toShellPath(path.relative(tmpDir, mainPy)))}`;
    } else if (language === "javascript") {
      const mainJs = sourceFiles.find((f) => ["main.js", "index.js"].includes(path.basename(f).toLowerCase())) || sourceFiles[0];
      runCmd = `echo ${q(sanitizeInput(actualInput))} | timeout ${timeoutSec} node ${q(toShellPath(path.relative(tmpDir, mainJs)))}`;
    }

    if (compileCmd) {
      const compileTimeoutMs = Math.min(600000, Math.max(90000, 30000 + (sourceFiles.length * 5000)));
      const compileRes = await execPromise(compileCmd, compileTimeoutMs, { cwd: tmpDir });
      // Guard branch for invalid state or input.
      if (compileRes.timedOut) {
        return {
          verdict: "CE",
          output: "",
          executionTime: 0,
          errorMessage: `Compilation time limit exceeded (${Math.round(compileTimeoutMs / 1000)}s). Try 120s/180s/300s/600s run limit or reduce project size.`,
          isGTest
        };
      }
      // Guard branch for invalid state or input.
      if (compileRes.exitCode !== 0) {
        return {
          verdict: "CE",
          output: "",
          executionTime: 0,
          errorMessage: (compileRes.stderr || "Compilation failed").substring(0, 1000),
          isGTest
        };
      }
    }

    const start = Date.now();
    const runRes = await execPromise(runCmd, effectiveTimeLimit + 5000, { cwd: tmpDir });
    const executionTime = Date.now() - start;

    // Guard branch for invalid state or input.
    if (runRes.timedOut) {
      return {
        verdict: "TLE",
        output: "",
        executionTime,
        errorMessage: `Time limit exceeded (${Math.round(effectiveTimeLimit / 1000)}s)`,
        isGTest
      };
    }

    // In Google Test mode, non-zero exit means tests failed.
    // Guard branch for invalid state or input.
    if (isGTest) {
      const rawOut = (runRes.stdout || "").trim();
      const gtestData = parseGTestOutput(rawOut);
      return {
        verdict: runRes.exitCode === 0 ? "AC" : "WA",
        output: rawOut,
        executionTime,
        errorMessage: runRes.stderr ? runRes.stderr.substring(0, 1000) : "",
        isGTest,
        gtestData
      };
    }

    // Guard branch for invalid state or input.
    if (runRes.exitCode !== 0 && runRes.stderr && !runRes.stdout) {
      return {
        verdict: "RE",
        output: "",
        executionTime,
        errorMessage: runRes.stderr.substring(0, 1000),
        isGTest
      };
    }

    return {
      verdict: "AC",
      output: (runRes.stdout || "").trim(),
      executionTime,
      errorMessage: runRes.stderr ? runRes.stderr.substring(0, 1000) : "",
      isGTest
    };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
};

exports.runProjectAgainstTests = async (zipPath, language, testCases = [], entryFile = "") => {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    const single = await exports.runProjectFromZip(zipPath, language, "", 5000, entryFile);
    return {
      isGTest: !!single.isGTest,
      testResults: [{
        type: single.isGTest ? "gtest" : "custom",
        input: "",
        expectedOutput: "",
        actualOutput: single.output || "",
        verdict: single.verdict,
        executionTime: single.executionTime || 0,
        memoryUsed: 0,
        points: 0,
        errorMessage: single.errorMessage || ""
      }]
    };
  }

  const probe = await exports.runProjectFromZip(zipPath, language, testCases[0]?.input || "", testCases[0]?.timeLimit || 5000, entryFile);

  // Guard branch for invalid state or input.
  if (probe.isGTest) {
    return {
      isGTest: true,
      gtestData: probe.gtestData || null,
      testResults: [{
        type: "gtest",
        input: "",
        expectedOutput: "",
        actualOutput: probe.output || "",
        verdict: probe.verdict,
        executionTime: probe.executionTime || 0,
        memoryUsed: 0,
        points: probe.verdict === "AC" ? (testCases.reduce((sum, tc) => sum + (tc.points || 1), 0) || 1) : 0,
        errorMessage: probe.errorMessage || ""
      }]
    };
  }

  // Guard branch for invalid state or input.
  if (probe.verdict === "CE") {
    return {
      isGTest: false,
      testResults: testCases.map((tc) => ({
        testCaseId: tc._id,
        type: tc.type || "basic",
        input: tc.input,
        expectedOutput: (tc.expectedOutput || "").trim(),
        actualOutput: "",
        verdict: "CE",
        executionTime: 0,
        memoryUsed: 0,
        points: 0,
        errorMessage: probe.errorMessage || "Compilation failed"
      }))
    };
  }

  const testResults = [];
  for (const tc of testCases) {
    const runRes = await exports.runProjectFromZip(zipPath, language, tc.input || "", tc.timeLimit || 5000, entryFile);
    const expected = (tc.expectedOutput || "").trim();
    const actual = (runRes.output || "").trim();

    let verdict = runRes.verdict;
    if (verdict === "AC") verdict = actual === expected ? "AC" : "WA";

    testResults.push({
      testCaseId: tc._id,
      type: tc.type || "basic",
      input: tc.input,
      expectedOutput: expected,
      actualOutput: actual,
      verdict,
      executionTime: runRes.executionTime || 0,
      memoryUsed: 0,
      points: verdict === "AC" ? (tc.points || 1) : 0,
      errorMessage: runRes.errorMessage || ""
    });
  }

  return { isGTest: false, testResults };
};
