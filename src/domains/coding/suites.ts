import { createHash } from "node:crypto";
import { codingDefinition } from "@/data/coding-problems";
import { codingProblemSchema, type CodingCase, type CodingMode } from "@/contracts/coding";

type Fixture = [string, CodingCase["args"], CodingCase["expected"]];
// Original, fixed examples and edge cases. Passing these is not a mastery score.
const fixtures: Record<string, Fixture[]> = {
  "two-sum": [
    ["A later match", [[5,9,2,7],11], [1,2]], ["Repeated value", [[3,3],6], [0,1]],
    ["Negative values", [[-8,-2,-5],-10], [0,1]], ["Zero", [[0,4,0],0], [0,2]],
    ["Match at the ends", [[2,5,7,11],13], [0,3]], ["Do not reuse an index", [[3,2,4],6], [1,2]],
  ],
  "contains-duplicate": [
    ["Duplicate", [[8,3,8]], true], ["All different", [[1,2,3]], false],
    ["Single item", [[4]], false], ["Negative duplicate", [[-1,0,-1]], true],
    ["Zero duplicate", [[0,0]], true], ["Separated duplicate", [[9,2,3,4,9]], true],
  ],
  "valid-anagram": [
    ["Reordered letters", ["listen","silent"], true], ["Different letters", ["rat","car"], false],
    ["Counts matter", ["aab","abb"], false], ["Same letter", ["a","a"], true],
    ["Different lengths", ["ab","a"], false], ["Repeated letters", ["aabbcc","cbacba"], true],
  ],
  "valid-parentheses": [
    ["Several pairs", ["()[]{}"], true], ["Wrong closing bracket", ["(]"], false],
    ["Nested", ["{[()]}"], true], ["Crossed pairs", ["([)]"], false],
    ["Unclosed", ["(("], false], ["Closing first", [")("], false],
  ],
  "best-time-to-buy-and-sell-stock": [
    ["A profitable trade", [[7,1,5,3,6,4]], 5], ["Falling prices", [[7,6,4,3,1]], 0],
    ["One day", [[8]], 0], ["Buy before selling", [[3,8,1,2]], 5],
    ["Same price", [[4,4,4]], 0], ["Rising prices", [[1,2,3,4]], 3],
  ],
  "valid-palindrome": [
    ["Ignore punctuation and case", ["A man, a plan, a canal: Panama"], true],
    ["Not a palindrome", ["race a car"], false], ["Only punctuation", ["., !"], true],
    ["Digits matter", ["0P"], false], ["One character", ["a"], true], ["Mixed case", ["AbBa"], true],
  ],
  "binary-search": [
    ["Middle item", [[-3,0,4,7,12],4], 2], ["Not found", [[-3,0,4,7,12],6], -1],
    ["First item", [[1,3,5],1], 0], ["Last item", [[1,3,5],5], 2],
    ["Single item", [[9],9], 0], ["Outside the range", [[2,6],1], -1],
  ],
  "climbing-stairs": [
    ["Two steps", [2], 2], ["Three steps", [3], 3], ["One step", [1], 1],
    ["Five steps", [5], 8], ["Ten steps", [10], 89], ["Larger input", [35], 14930352],
  ],
  "longest-substring-without-repeating-characters": [
    ["Repeating pattern", ["abcabcbb"], 3], ["Same character", ["bbbbb"], 1],
    ["Window starts later", ["pwwkew"], 3], ["Empty string", [""], 0],
    ["Do not move backward", ["abba"], 2], ["Spaces count", ["a b c"], 3],
  ],
  "product-of-array-except-self": [
    ["Positive values", [[1,2,3,4]], [24,12,8,6]], ["One zero", [[-1,1,0,-3,3]], [0,0,9,0,0]],
    ["Two zeroes", [[0,2,0]], [0,0,0]], ["Negative values", [[-2,-3,-4]], [12,8,6]],
    ["Two items", [[2,5]], [5,2]], ["Unit values", [[1,1,1]], [1,1,1]],
  ],
  "merge-intervals": [
    ["One overlap", [[[1,3],[2,6],[8,10],[15,18]]], [[1,6],[8,10],[15,18]]],
    ["Touching ends", [[[1,4],[4,5]]], [[1,5]]], ["Nested", [[[1,10],[2,3],[4,8]]], [[1,10]]],
    ["Unsorted", [[[8,9],[1,2],[2,6]]], [[1,6],[8,9]]], ["One interval", [[[3,4]]], [[3,4]]],
    ["All separate", [[[1,2],[4,5],[7,8]]], [[1,2],[4,5],[7,8]]],
  ],
  "maximum-subarray": [
    ["Mixed values", [[-2,1,-3,4,-1,2,1,-5,4]], 6], ["One item", [[1]], 1],
    ["All negative", [[-8,-3,-6,-2,-5]], -2], ["All positive", [[2,3,4]], 9],
    ["Zero", [[-1,0,-2]], 0], ["Best prefix", [[5,4,-9,1]], 9],
  ],
  "coin-change": [
    ["Several denominations", [[1,2,5],11], 3], ["Impossible amount", [[2],3], -1],
    ["Zero amount", [[1],0], 0], ["Greedy is insufficient", [[1,3,4],6], 2],
    ["Unsorted coins", [[5,1,2],7], 2], ["No exact change", [[4,6],5], -1],
  ],
  "container-with-most-water": [
    ["Different heights", [[1,8,6,2,5,4,8,3,7]], 49], ["Two heights", [[1,1]], 1],
    ["Equal heights", [[4,4,4,4]], 12], ["Tall ends", [[9,1,1,9]], 27],
    ["Zero height", [[0,2,0]], 0], ["Rising heights", [[1,2,3,4]], 4],
  ],
};
export function codingSuite(id: string, mode: CodingMode) {
  const definition = codingDefinition(id);
  const rows = fixtures[id];
  if (!definition || !rows) return null;
  const all: CodingCase[] = rows.map(([name,args,expected], index) => ({ id: `case-${index+1}`, name, args, expected }));
  const version = createHash("sha256").update(JSON.stringify({ definition, all, harness: 1 })).digest("hex");
  return { ...definition, cases: mode === "examples" ? all.slice(0,2) : all, version,
    problem: codingProblemSchema.parse({ ...definition, examples: all.slice(0,2), totalCases: all.length }) };
}
