import type { NoteLanguage } from "@/data/interview-notes";

// Small static highlighter for short Python and JavaScript snippets. It labels comments,
// strings, numbers, keywords, literals, built-ins, and names being defined. Joining the
// token texts always reproduces the source exactly.
export type CodeTokenKind = "plain" | "keyword" | "string" | "comment" | "number" | "literal" | "builtin" | "definition";
export type CodeToken = { text: string; kind: CodeTokenKind };

const keywords: Record<NoteLanguage, Set<string>> = {
  python: new Set(["and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"]),
  javascript: new Set(["async", "await", "break", "case", "catch", "class", "const", "continue", "default", "delete", "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "let", "new", "of", "return", "static", "switch", "throw", "try", "typeof", "var", "while", "yield"]),
};

const literals: Record<NoteLanguage, Set<string>> = {
  python: new Set(["True", "False", "None", "self"]),
  javascript: new Set(["true", "false", "null", "undefined", "NaN", "this", "super"]),
};

const builtins: Record<NoteLanguage, Set<string>> = {
  python: new Set(["abs", "all", "any", "bool", "dict", "enumerate", "int", "isinstance", "len", "list", "max", "min", "next", "print", "range", "repr", "reversed", "set", "sorted", "str", "sum", "tuple", "zip", "Exception", "ValueError", "Counter", "defaultdict", "deque", "cache"]),
  javascript: new Set(["Array", "BigInt", "Boolean", "Error", "JSON", "Map", "Math", "Number", "Object", "Promise", "RangeError", "Response", "Set", "String", "TypeError", "AbortSignal", "console", "fetch", "encodeURIComponent"]),
};

const patterns: Record<NoteLanguage, RegExp> = {
  python: /(#[^\n]*)|([rbfuRBFU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_][\w]*)/g,
  javascript: /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?\b)|([A-Za-z_$][\w$]*)/g,
};

const definers = new Set(["def", "class", "function"]);

export function highlightCode(source: string, language: NoteLanguage): CodeToken[] {
  const tokens: CodeToken[] = [];
  const push = (text: string, kind: CodeTokenKind) => {
    if (!text) return;
    const last = tokens.at(-1);
    if (last && last.kind === kind && kind === "plain") last.text += text;
    else tokens.push({ text, kind });
  };
  const pattern = new RegExp(patterns[language].source, "g");
  let cursor = 0;
  let defineNext = false;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    push(source.slice(cursor, start), "plain");
    const [text, comment, string, number, word] = match;
    if (comment) push(text, "comment");
    else if (string) push(text, "string");
    else if (number) push(text, "number");
    else if (word) {
      const afterDot = source[start - 1] === ".";
      let kind: CodeTokenKind = "plain";
      if (defineNext) kind = "definition";
      else if (afterDot) kind = "plain";
      else if (keywords[language].has(word)) kind = "keyword";
      else if (literals[language].has(word)) kind = "literal";
      else if (builtins[language].has(word)) kind = "builtin";
      push(text, kind);
      defineNext = !afterDot && definers.has(word);
      cursor = start + text.length;
      continue;
    }
    defineNext = false;
    cursor = start + text.length;
  }
  push(source.slice(cursor), "plain");
  return tokens;
}
