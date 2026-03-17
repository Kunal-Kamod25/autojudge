const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

const LANG_CONFIG = {
  cpp: { ext: "cpp", compile: (f) => `g++ -O2 -o ${f}.out ${f}.cpp`, run: (f, input) => `echo "${input}" | timeout 5 ${f}.out`, compiled: true },
  c:   { ext: "c",   compile: (f) => `gcc -O2 -o ${f}.out ${f}.c`,   run: (f, input) => `echo "${input}" | timeout 5 ${f}.out`, compiled: true },
  python: { ext: "py", run: (f, input) => `echo "${input}" | timeout 5 python3 ${f}.py`, compiled: false },
  java: { ext: "java", compile: (f, cls) => `javac ${f}.java`, run: (f, cls, input) => `echo "${input}" | timeout 10 java -cp ${path.dirname(f)} ${cls}`, compiled: true },
  javascript: { ext: "js", run: (f, input) => `echo "${input}" | timeout 5 node ${f}.js`, compiled: false }
};

const execPromise = (cmd, timeoutMs = 10000) => new Promise((resolve, reject) => {
  const proc = exec(cmd, { timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err && err.killed) resolve({ stdout: "", stderr: "TIME_LIMIT_EXCEEDED", timedOut: true });
    else resolve({ stdout: stdout || "", stderr: stderr || "", exitCode: err ? err.code : 0 });
  });
});

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
