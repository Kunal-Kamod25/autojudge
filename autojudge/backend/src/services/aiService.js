// This file drives the aiService feature flow and keeps the behavior easy to reason about.
const { GoogleGenerativeAI } = require("@google/generative-ai");

let groqClient = null;
// Wrap this block to return a clean API/UI error path if anything fails.
try {
  const Groq = require("groq-sdk");
  if (process.env.GROQ_API_KEY) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch(e) {}

let anthropicClient = null;
// Wrap this block to return a clean API/UI error path if anything fails.
try {
  const Anthropic = require("@anthropic-ai/sdk");
  if (process.env.ANTHROPIC_API_KEY) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
} catch(e) {}

// getGemini handles one focused part of this file's workflow.
const getGemini = () => {
  // Quick guard clause so we fail fast before doing heavier work.
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
};

// askGroq handles one focused part of this file's workflow.
const askGroq = async (prompt) => {
  if (!groqClient) throw new Error("Groq not configured");
  const res = await groqClient.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2048, temperature: 0.3
  });
  return res.choices[0].message.content;
};

// askClaude handles one focused part of this file's workflow.
const askClaude = async (prompt) => {
  if (!anthropicClient) throw new Error("Claude not configured");
  const res = await anthropicClient.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }]
  });
  return res.content[0].text;
};

// askGemini handles one focused part of this file's workflow.
const askGemini = async (prompt) => {
  const model = getGemini();
  if (!model) throw new Error("Gemini not configured");
  const res = await model.generateContent(prompt);
  return res.response.text();
};

// askHuggingFace handles one focused part of this file's workflow.
const askHuggingFace = async (prompt) => {
  const res = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1024 } })
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0].generated_text : data.generated_text || "";
};

// askAI handles one focused part of this file's workflow.
const askAI = async (prompt) => {
  // Try in order: Groq (fastest) → Claude → Gemini → HuggingFace → Fallback
  const attempts = [];
  if (process.env.GROQ_API_KEY) attempts.push({ fn: askGroq, name: "Groq/Llama3" });
  if (process.env.ANTHROPIC_API_KEY) attempts.push({ fn: askClaude, name: "Claude" });
  if (process.env.GEMINI_API_KEY) attempts.push({ fn: askGemini, name: "Gemini" });
  if (process.env.HUGGINGFACE_API_KEY) attempts.push({ fn: askHuggingFace, name: "HuggingFace" });

  for (const { fn, name } of attempts) {
    try { return { text: await fn(prompt), model: name }; } catch(e) { continue; }
  }
  return { text: "AI service unavailable. Manual review required.", model: "none" };
};

exports.generateFeedback = async (code, language, testResults, problemTitle) => {
  const passed = testResults.filter(r => r.verdict === "AC").length;
  const total = testResults.length;
  const failedTests = testResults.filter(r => r.verdict !== "AC").slice(0, 3);

  const prompt = `You are an expert programming tutor. Analyze this ${language} code submission for "${problemTitle}".

CODE:
\`\`\`${language}
${code.substring(0, 2000)}
\`\`\`

RESULTS: ${passed}/${total} test cases passed.
FAILED TESTS: ${JSON.stringify(failedTests.map(t => ({ input: t.input?.substring(0,100), expected: t.expectedOutput?.substring(0,100), got: t.actualOutput?.substring(0,100), verdict: t.verdict })))}

Provide a structured analysis in JSON format:
{
  "summary": "2-3 sentence overall assessment",
  "bugs": ["specific bug 1", "specific bug 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "complexity": "time and space complexity analysis",
  "style": "code style and readability comments",
  "score_justification": "why the score is fair"
}
Only respond with valid JSON.`;

  const { text, model } = await askAI(prompt);
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return { ...parsed, modelUsed: model };
  } catch(e) {
    return { summary: text.substring(0, 500), bugs: [], improvements: [], complexity: "", style: "", modelUsed: model };
  }
};

exports.generateTestCases = async (problemStatement, language, count = 20) => {
  const prompt = `Generate ${count} diverse test cases for this programming problem in ${language}.

PROBLEM: ${problemStatement}

Generate test cases covering: basic cases, edge cases (empty/null/zero), boundary values, stress tests, and random cases.

Respond ONLY with JSON array:
[
  { "input": "...", "expectedOutput": "...", "type": "basic|edge|stress|boundary|random", "timeLimit": 2000 },
  ...
]`;

  const { text } = await askAI(prompt);
  // Wrap this block to return a clean API/UI error path if anything fails.
  try {
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || "[]");
    return arr.slice(0, count);
  } catch(e) { return []; }
};

exports.detectPlagiarism = async (code1, code2, language) => {
  // Simple token-based similarity
  // tokenize handles one focused part of this file's workflow.
  const tokenize = (c) => c.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
  const t1 = new Set(tokenize(code1)), t2 = new Set(tokenize(code2));
  const intersection = [...t1].filter(t => t2.has(t)).length;
  const union = new Set([...t1, ...t2]).size;
  const similarity = union > 0 ? Math.round((intersection / union) * 100) : 0;
  return { similarity, flagged: similarity > 70, details: `Token similarity: ${similarity}%` };
};
