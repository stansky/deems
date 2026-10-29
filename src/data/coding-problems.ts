// Function contracts are public. Full test suites stay on the server.
const definitions = {
  "two-sum": ["twoSum", "nums", "target"],
  "contains-duplicate": ["containsDuplicate", "nums"],
  "valid-anagram": ["isAnagram", "s", "t"],
  "valid-parentheses": ["isValid", "s"],
  "best-time-to-buy-and-sell-stock": ["maxProfit", "prices"],
  "valid-palindrome": ["isPalindrome", "s"],
  "binary-search": ["search", "nums", "target"],
  "climbing-stairs": ["climbStairs", "n"],
  "longest-substring-without-repeating-characters": ["lengthOfLongestSubstring", "s"],
  "product-of-array-except-self": ["productExceptSelf", "nums"],
  "merge-intervals": ["mergeIntervals", "intervals"],
  "maximum-subarray": ["maxSubArray", "nums"],
  "coin-change": ["coinChange", "coins", "amount"],
  "container-with-most-water": ["maxArea", "height"],
} as const;
export const runnableQuestionIds: readonly string[] = Object.keys(definitions);
export function codingDefinition(id: string) {
  const entry = definitions[id as keyof typeof definitions];
  if (!entry) return null;
  const [functionName, ...parameters] = entry;
  return {
    id, functionName, parameters,
    starter: {
      javascript: `function ${functionName}(${parameters.join(", ")}) {\n  // Write your solution here.\n  throw new Error("Not implemented");\n}\n`,
      python: `def ${functionName}(${parameters.join(", ")}):\n    # Write your solution here.\n    raise NotImplementedError("Write your solution")\n`,
    },
  };
}
