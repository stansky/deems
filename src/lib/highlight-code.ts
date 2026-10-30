// Small static highlighter for short TypeScript snippets. It labels comments, strings, numbers,
// keywords, literals, built-in types and globals, and names being declared. Joining the token
// texts always reproduces the source exactly.
export type CodeTokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "literal" | "builtin" | "definition";
export type CodeToken = { text: string; kind: CodeTokenKind };

const keywords = new Set([
  "abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default",
  "delete", "do", "else", "enum", "export", "extends", "finally", "for", "function", "if", "implements",
  "import", "in", "infer", "instanceof", "interface", "is", "keyof", "let", "new", "of", "private",
  "protected", "public", "readonly", "return", "satisfies", "static", "switch", "throw", "try", "type",
  "typeof", "var", "while", "yield",
]);
const literals = new Set(["true", "false", "null", "undefined", "NaN", "Infinity", "this", "super"]);
const builtins = new Set([
  "string", "number", "boolean", "unknown", "never", "any", "void", "object", "bigint", "symbol",
  "Array", "BigInt", "Boolean", "Date", "Error", "JSON", "Map", "Math", "Number", "Object", "Promise",
  "RangeError", "Record", "Partial", "Required", "Readonly", "Pick", "Omit", "ReturnType", "Parameters",
  "Awaited", "NonNullable", "Response", "Set", "String", "TypeError", "AbortSignal", "console", "fetch",
  "setTimeout", "clearTimeout", "structuredClone",
]);
const declarers = new Set(["class", "function", "interface", "type", "enum"]);
const pattern = /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b)|([A-Za-z_$][\w$]*)/g;

export function highlightCode(source: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const push = (text: string, kind: CodeTokenKind) => {
    if (!text) return;
    const last = tokens.at(-1);
    if (last && last.kind === kind && kind === "plain") last.text += text;
    else tokens.push({ text, kind });
  };
  let cursor = 0;
  let declareNext = false;
  for (const match of source.matchAll(new RegExp(pattern.source, "g"))) {
    const start = match.index ?? 0;
    push(source.slice(cursor, start), "plain");
    const [text, comment, string, number, word] = match;
    cursor = start + text.length;
    if (comment) push(text, "comment");
    else if (string) push(text, "string");
    else if (number) push(text, "number");
    else if (word) {
      const afterDot = source[start - 1] === ".";
      // An object or type member name (`type: "x"`, `id?: number`) is not a keyword.
      const isMemberName = /^\??:(?!:)/.test(source.slice(cursor).trimStart()) && word !== "default";
      let kind: CodeTokenKind = "plain";
      if (declareNext && !keywords.has(word)) kind = "definition";
      else if (afterDot || isMemberName) kind = "plain";
      else if (keywords.has(word)) kind = "keyword";
      else if (literals.has(word)) kind = "literal";
      else if (builtins.has(word)) kind = "builtin";
      push(text, kind);
      declareNext = kind === "keyword" && declarers.has(word);
      continue;
    }
    declareNext = false;
  }
  push(source.slice(cursor), "plain");
  return tokens;
}
