const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const os = require("os");
const AdmZip = require("adm-zip");

const LANG_CONFIG = {
  cpp: { ext: "cpp", compile: (f) => `g++ -O2 -o ${f}.out ${f}.cpp`, run: (f, input) => `echo "${input}" | timeout 5 ${f}.out`, compiled: true },
  c:   { ext: "c",   compile: (f) => `gcc -O2 -o ${f}.out ${f}.c`,   run: (f, input) => `echo "${input}" | timeout 5 ${f}.out`, compiled: true },
  python: { ext: "py", run: (f, input) => `echo "${input}" | timeout 5 python3 ${f}.py`, compiled: false },
  java: { ext: "java", compile: (f, cls) => `javac ${f}.java`, run: (f, cls, input) => `echo "${input}" | timeout 10 java -cp ${path.dirname(f)} ${cls}`, compiled: true },
  javascript: { ext: "js", run: (f, input) => `echo "${input}" | timeout 5 node ${f}.js`, compiled: false }
};

const execPromise = (cmd, timeoutMs = 10000, options = {}) => new Promise((resolve) => {
  exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024, cwd: options.cwd }, (err, stdout, stderr) => {
    if (err && err.killed) resolve({ stdout: "", stderr: "TIME_LIMIT_EXCEEDED", timedOut: true });
    else resolve({ stdout: stdout || "", stderr: stderr || "", exitCode: err ? err.code : 0 });
  });
});

const walkFiles = (root) => {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
};

const toShellPath = (p) => p.replace(/\\/g, "/");
const q = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
const sanitizeInput = (value) => String(value || "").replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");

const detectGTestProject = (files) => {
  const patterns = [/gtest\/gtest\.h/, /\bTEST(_F|_P)?\s*\(/, /\bRUN_ALL_TESTS\s*\(/];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (![".cpp", ".cc", ".cxx", ".hpp", ".h"].includes(ext)) continue;
    try {
      const content = fs.readFileSync(file, "utf-8");
      if (patterns.some((re) => re.test(content))) return true;
    } catch (e) {
      // Ignore unreadable files while scanning
    }
  }
  return false;
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
    let runCmd;
    if (language === "java") runCmd = lang.run(filePath, className, safeInput);
    else runCmd = lang.run(filePath, safeInput);

    const { stdout, stderr, timedOut } = await execPromise(runCmd, (tc.timeLimit || 5000) + 2000);
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

  try {
    if (lang.compiled) {
      const compileCmd = lang.compile(filePath, className);
      const { stderr, exitCode } = await execPromise(compileCmd, 15000);
      if (exitCode !== 0) {
        return {
          verdict: "CE",
          output: "",
          executionTime: 0,
          errorMessage: (stderr || "Compilation failed").substring(0, 500)
        };
      }
    }

    const safeInput = String(input).replace(/"/g, '\\"').replace(/`/g, "\\`").replace(/\$/g, "\\$");
    const start = Date.now();
    const runCmd = language === "java" ? lang.run(filePath, className, safeInput) : lang.run(filePath, safeInput);
    const { stdout, stderr, timedOut } = await execPromise(runCmd, timeLimit + 2000);
    const executionTime = Date.now() - start;

    if (timedOut) {
      return { verdict: "TLE", output: "", executionTime, errorMessage: "Time limit exceeded" };
    }

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

exports.runProjectFromZip = async (zipPath, language, input = "", timeLimit = 5000) => {
  const tmpDir = path.join(os.tmpdir(), `aj_proj_${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tmpDir, true);

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
    if (sourceFiles.length === 0) {
      return { verdict: "CE", output: "", executionTime: 0, errorMessage: `No ${language} source files found in zip`, isGTest: false };
    }

    const isGTest = language === "cpp" && detectGTestProject(allFiles);
    const relSources = sourceFiles.map((f) => q(toShellPath(path.relative(tmpDir, f))));

    let runCmd = "";
    let compileCmd = "";

    if (language === "cpp") {
      compileCmd = `g++ -std=c++17 -O2 ${relSources.join(" ")} -o main.out${isGTest ? " -lgtest -lgtest_main -pthread" : ""}`;
      runCmd = isGTest
        ? "timeout 10 ./main.out"
        : `echo ${q(sanitizeInput(input))} | timeout 10 ./main.out`;
    } else if (language === "c") {
      compileCmd = `gcc -O2 ${relSources.join(" ")} -o main.out`;
      runCmd = `echo ${q(sanitizeInput(input))} | timeout 10 ./main.out`;
    } else if (language === "java") {
      compileCmd = `javac ${relSources.join(" ")}`;
      const javaMainFile = sourceFiles.find((file) => {
        try {
          const content = fs.readFileSync(file, "utf-8");
          return /public\s+static\s+void\s+main\s*\(/.test(content);
        } catch (e) {
          return false;
        }
      }) || sourceFiles[0];
      const mainClass = path.basename(javaMainFile, ".java");
      runCmd = `echo ${q(sanitizeInput(input))} | timeout 10 java -cp . ${mainClass}`;
    } else if (language === "python") {
      const mainPy = sourceFiles.find((f) => path.basename(f).toLowerCase() === "main.py") || sourceFiles[0];
      runCmd = `echo ${q(sanitizeInput(input))} | timeout 10 python3 ${q(toShellPath(path.relative(tmpDir, mainPy)))}`;
    } else if (language === "javascript") {
      const mainJs = sourceFiles.find((f) => ["main.js", "index.js"].includes(path.basename(f).toLowerCase())) || sourceFiles[0];
      runCmd = `echo ${q(sanitizeInput(input))} | timeout 10 node ${q(toShellPath(path.relative(tmpDir, mainJs)))}`;
    }

    if (compileCmd) {
      const compileRes = await execPromise(compileCmd, 20000, { cwd: tmpDir });
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
    const runRes = await execPromise(runCmd, timeLimit + 5000, { cwd: tmpDir });
    const executionTime = Date.now() - start;

    if (runRes.timedOut) {
      return { verdict: "TLE", output: "", executionTime, errorMessage: "Time limit exceeded", isGTest };
    }

    // In Google Test mode, non-zero exit means tests failed.
    if (isGTest) {
      return {
        verdict: runRes.exitCode === 0 ? "AC" : "WA",
        output: (runRes.stdout || "").trim(),
        executionTime,
        errorMessage: runRes.stderr ? runRes.stderr.substring(0, 1000) : "",
        isGTest
      };
    }

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
