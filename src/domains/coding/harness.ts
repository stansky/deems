import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { CodingCase, CodingCaseResult, CodingLanguage } from "@/contracts/coding";

export function executionSource(language: CodingLanguage, code: string, functionName: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) throw new Error("Invalid function contract.");
  if (language === "javascript") return `
const __deemsFs = require("fs");
const __deemsInput = JSON.parse(__deemsFs.readFileSync(0, "utf8"));
const __deemsWrite = process.stdout.write.bind(process.stdout);
let __deemsLogSize = 0;
const __deemsLog = (...values) => {
  if (__deemsLogSize >= 4000) return;
  const text = values.map(value => typeof value === "string" ? value : require("util").inspect(value)).join(" ").slice(0, 4000 - __deemsLogSize);
  __deemsLogSize += text.length + 1; process.stderr.write(text + "\\n");
};
console.log = console.info = console.warn = console.error = console.debug = __deemsLog;
${code}
;(async () => {
  const results = [];
  for (const item of __deemsInput) {
    try {
      const actual = await ${functionName}(...item.args);
      if (actual === undefined || JSON.stringify(actual) === undefined) throw new Error("Return a JSON value from ${functionName}.");
      results.push({ id: item.id, actual, error: null });
    } catch (error) { results.push({ id: item.id, actual: null, error: String(error && error.message || error).slice(0, 1000) }); }
  }
  __deemsWrite(JSON.stringify({ results }));
})().catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
`;
  return `import sys as __deems_sys, json as __deems_json, io as __deems_io, contextlib as __deems_contextlib
__deems_input = __deems_json.load(__deems_sys.stdin)
class __DeemsLog(__deems_io.TextIOBase):
    def __init__(self): self.text = ""
    def write(self, value):
        self.text += str(value)[:max(0, 4000-len(self.text))]
        return len(value)
__deems_log = __DeemsLog()
__deems_scope = {"__name__": "__main__"}
__deems_results = []
with __deems_contextlib.redirect_stdout(__deems_log), __deems_contextlib.redirect_stderr(__deems_log):
    exec(compile(${JSON.stringify(code)}, "solution.py", "exec"), __deems_scope)
    for __deems_item in __deems_input:
        try:
            __deems_actual = __deems_scope[${JSON.stringify(functionName)}](*__deems_item["args"])
            __deems_json.dumps(__deems_actual, allow_nan=False)
            __deems_results.append({"id": __deems_item["id"], "actual": __deems_actual, "error": None})
        except Exception as __deems_error:
            __deems_results.append({"id": __deems_item["id"], "actual": None, "error": (type(__deems_error).__name__ + ": " + str(__deems_error))[:1000]})
__deems_sys.stderr.write(__deems_log.text)
__deems_sys.stdout.write(__deems_json.dumps({"results": __deems_results}, allow_nan=False))
`;
}

const resultSchema = z.object({ results: z.array(z.object({ id: z.string(), actual: z.json(), error: z.string().max(1000).nullable() }).strict()).max(30) }).strict();
function normalized(value: unknown): unknown {
  if (typeof value === "number" && Object.is(value, -0)) return 0;
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalized(item)]));
  return value;
}
export function compareResults(questionId: string, cases: CodingCase[], stdout: string): CodingCaseResult[] {
  const parsed = resultSchema.parse(JSON.parse(stdout));
  if (parsed.results.length !== cases.length || new Set(parsed.results.map(row => row.id)).size !== cases.length) throw new Error("Incomplete runner output.");
  return cases.map(test => {
    const result = parsed.results.find(row => row.id === test.id);
    if (!result) throw new Error("Missing test result.");
    let actual: unknown = normalized(result.actual);
    let expected: unknown = normalized(test.expected);
    // The two matching indices may be returned in either order.
    if (questionId === "two-sum" && Array.isArray(actual) && actual.length === 2 && actual.every(Number.isInteger)) {
      actual = [...actual].sort((a,b) => Number(a)-Number(b)); expected = [...test.expected as number[]].sort((a,b) => a-b);
    }
    return { ...test, actual: result.actual, error: result.error, status: result.error ? "runtime_error" : isDeepStrictEqual(actual, expected) ? "passed" : "wrong_answer" };
  });
}
