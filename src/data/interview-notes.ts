// Companion pages for the printed interview sticky notes. A note's number matches the
// circled number printed on it; /notes/<number> opens it full screen.
export type NoteLanguage = "python" | "javascript";

export type InterviewNoteCode = { language: NoteLanguage; source: string; caption?: string };

export type InterviewNote = {
  number: number;
  id: string;
  title: string;
  language: NoteLanguage | "any";
  topic: string;
  summary: string;
  useWhen: string[];
  code: InterviewNoteCode[];
  tips: string[];
  watchOut: string[];
  say?: string;
};

export const interviewNotes: InterviewNote[] = [
  {
    number: 1, id: "pick-loop", title: "Which tool?", language: "any", topic: "Loops and choices",
    summary: "Before you type, ask one question: am I making a choice, visiting items I already have, or repeating until something changes?",
    useWhen: [
      "Choosing between paths → if / elif / else",
      "You already have the items and want each one → for",
      "You can only say when to stop, not how many times → while",
      "A known maximum, but you may stop early → for + break",
      "A new list from an old one → comprehension (Python) or map / filter (JS)",
    ],
    code: [
      { language: "python", source: `prices = [3, 12, 7]

# if: choose one path
if not prices:
    print("nothing to buy")

# for: visit items you already have
total = 0
for p in prices:
    total += p
print(total)  # 22

# while: repeat until something changes
budget = 20
while budget >= 7:
    budget -= 7
print(budget)  # 6` },
      { language: "javascript", source: `const prices = [3, 12, 7];

if (prices.length === 0) console.log("nothing to buy");

let total = 0;
for (const p of prices) total += p;
console.log(total); // 22

let budget = 20;
while (budget >= 7) budget -= 7;
console.log(budget); // 6` },
    ],
    tips: [
      "Most interview code is a for loop with an if inside it.",
      "If you can name the list you are walking, write for. If you can only name the stopping condition, write while.",
      "A retry with a maximum count is for + break, not while True.",
      "continue skips one item, break leaves the loop, return leaves the function.",
    ],
    watchOut: [
      "A while loop with no line that changes its condition runs forever.",
      "JavaScript forEach cannot break. Use for...of when you might stop early.",
    ],
    say: "I'll use a for loop because I already have the list and need each item once.",
  },
  {
    number: 2, id: "for-py", title: "for loops", language: "python", topic: "Loops and choices",
    summary: "for walks anything iterable: a list, string, dict, set, or range. It stops by itself after the last item.",
    useWhen: [
      "Visit every item in a list or string",
      "Count from 0 to n - 1 with range(n)",
      "Need the position too → enumerate",
      "Walk two lists side by side → zip",
      "Need keys and values of a dict → .items()",
    ],
    code: [
      { language: "python", source: `names = ["ana", "bo", "cy"]

for name in names:
    print(name)

for i in range(3):          # 0, 1, 2
    print(i)

for i in range(1, 4):       # 1, 2, 3
    print(i)

for i, name in enumerate(names):
    print(i, name)          # 0 ana, 1 bo, 2 cy

ages = {"ana": 31, "bo": 27}
for name, age in ages.items():
    print(name, age)

for name, age in zip(names, [31, 27, 40]):
    print(name, age)

for name in reversed(names):
    print(name)             # cy, bo, ana` },
    ],
    tips: [
      "range(n) stops before n. Write range(1, n + 1) for 1 through n.",
      "enumerate gives the index and the item, so you never manage a counter by hand.",
      "Looping over a dict alone gives its keys. Use .items() for both.",
      "zip stops at the shortest list.",
    ],
    watchOut: [
      "Removing items from a list while looping over it skips items. Loop over list(items) or build a new list.",
      "Reassigning the loop variable does not change the list.",
    ],
    say: "enumerate gives me the index as well, so I don't track a counter.",
  },
  {
    number: 3, id: "for-js", title: "for loops", language: "javascript", topic: "Loops and choices",
    summary: "for...of is the everyday JavaScript loop for arrays, strings, Maps, and Sets. Use the counting form when you need the index for math.",
    useWhen: [
      "Visit every value → for...of",
      "Need i to compare neighbors → for (let i = 0; i < n; i++)",
      "Need index and value → for (const [i, x] of xs.entries())",
      "Walk a Map → for (const [key, value] of map)",
      "Walk a plain object → Object.entries(obj)",
    ],
    code: [
      { language: "javascript", source: `const names = ["ana", "bo", "cy"];

for (const name of names) console.log(name);

for (let i = 0; i < names.length; i++) {
  console.log(i, names[i]);
}

for (const [i, name] of names.entries()) {
  console.log(i, name);
}

const ages = new Map([["ana", 31], ["bo", 27]]);
for (const [name, age] of ages) console.log(name, age);

const config = { retries: 3, debug: true };
for (const [key, value] of Object.entries(config)) {
  console.log(key, value);
}

for (const i in names) console.log(typeof i); // string` },
    ],
    tips: [
      "Use const in for...of and let in the counting loop.",
      "for...of works on strings too: for (const ch of word).",
      "The counting form is right when you read names[i + 1] or go backwards.",
    ],
    watchOut: [
      "for...in gives keys as strings and also walks inherited keys. Never use it on arrays.",
      "forEach cannot be stopped with break.",
    ],
    say: "I'll use for...of because I only need the values.",
  },
  {
    number: 4, id: "while-py", title: "while loop", language: "python", topic: "Loops and choices",
    summary: "Use while when you don't know how many steps it takes and you stop because something changed. Every while loop needs a start, a test, and a step that moves toward the end.",
    useWhen: [
      "Halving or shrinking a number until it is small",
      "Two pointers walking toward each other",
      "Binary search on a sorted list",
      "Paging through an API until there is no next cursor",
    ],
    code: [
      { language: "python", source: `n, steps = 40, 0          # 1. start
while n > 1:              # 2. test
    n //= 2               # 3. move
    steps += 1
print(steps)  # 5

def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("racecar"))  # True
print(is_palindrome("ab"))       # False

def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9], 7))  # 3` },
    ],
    tips: [
      "Write the move line first so you cannot forget it.",
      "Two pointers use left < right. Binary search uses lo <= hi.",
      "while True is fine when every path out has a break or return.",
    ],
    watchOut: [
      "No move line means an infinite loop.",
      "Decide < or <= before typing; that one character is the classic off-by-one.",
    ],
    say: "This is a while loop because I stop when the pointers meet, not after a fixed count.",
  },
  {
    number: 5, id: "while-js", title: "while loop", language: "javascript", topic: "Loops and choices",
    summary: "Same idea as Python: start, test, move. JavaScript has no integer division operator, so use Math.floor when halving.",
    useWhen: [
      "Shrinking a number until it is small",
      "Two pointers walking toward each other",
      "Binary search on a sorted array",
      "Paging until there is no next cursor (do...while)",
    ],
    code: [
      { language: "javascript", source: `let n = 40, steps = 0;    // 1. start
while (n > 1) {           // 2. test
  n = Math.floor(n / 2);  // 3. move
  steps++;
}
console.log(steps); // 5

function isPalindrome(s) {
  let left = 0, right = s.length - 1;
  while (left < right) {
    if (s[left] !== s[right]) return false;
    left++;
    right--;
  }
  return true;
}
console.log(isPalindrome("racecar")); // true
console.log(isPalindrome("ab"));      // false

function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
console.log(binarySearch([1, 3, 5, 7, 9], 7)); // 3` },
    ],
    tips: [
      "do { ... } while (cond) runs the body at least once, which fits paging.",
      "Use let, not const, for values the loop changes.",
      "Write the move line first.",
    ],
    watchOut: [
      "n / 2 gives a decimal in JavaScript. Use Math.floor.",
      "A missing move line freezes the page.",
    ],
    say: "I don't know how many steps it takes, so a while loop with a clear stop condition fits.",
  },
  {
    number: 6, id: "if-py", title: "if and guard clause", language: "python", topic: "Loops and choices",
    summary: "if checks a condition once and runs the matching block. The first true branch wins, so order matters. A guard clause handles the bad case first and returns early.",
    useWhen: [
      "Picking one of several outcomes → if / elif / else",
      "Empty or invalid input → guard clause at the top",
      "A short either-or value → x if cond else y",
    ],
    code: [
      { language: "python", source: `def grade(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    else:
        return "C"

print(grade(95), grade(85), grade(10))  # A B C

def average(nums):
    if not nums:            # guard clause
        return 0
    return sum(nums) / len(nums)

print(average([]), average([2, 4]))  # 0 3.0

label = "even" if 7 % 2 == 0 else "odd"
print(label)  # odd` },
    ],
    tips: [
      "Put the most specific check first, because later branches are skipped.",
      "Use separate ifs, not elif, when more than one block may run.",
      "A guard clause keeps the main code unindented and easy to read.",
    ],
    watchOut: [
      "if x: is False for 0 and \"\". Write if x is not None when 0 is a real value.",
      "= assigns and == compares.",
    ],
    say: "I'll handle the empty case first and return early, so the main logic has no special cases.",
  },
  {
    number: 7, id: "if-js", title: "if and guard clause", language: "javascript", topic: "Loops and choices",
    summary: "Same shape as Python with else if and braces. Always compare with ===. Use the ternary for a short either-or value.",
    useWhen: [
      "Picking one of several outcomes → if / else if / else",
      "Empty input → guard clause at the top",
      "Short either-or value → cond ? a : b",
      "Many exact values → switch",
    ],
    code: [
      { language: "javascript", source: `function grade(score) {
  if (score >= 90) return "A";
  else if (score >= 80) return "B";
  else return "C";
}
console.log(grade(95), grade(85), grade(10)); // A B C

function first(items) {
  if (items.length === 0) return null; // guard clause
  return items[0];
}
console.log(first([]), first([7])); // null 7

const label = 7 % 2 === 0 ? "even" : "odd";
console.log(label); // odd

const status = 404;
switch (status) {
  case 200: console.log("ok"); break;
  case 404: console.log("missing"); break;
  default: console.log("other");
}` },
    ],
    tips: [
      "Braces are optional for one line, but use them when the block may grow.",
      "Return early from a guard clause instead of nesting the main code in else.",
    ],
    watchOut: [
      "== converts types (\"1\" == 1 is true). Use ===.",
      "[] and {} are truthy, so if (items) is always true for an array.",
      "switch falls through to the next case without break.",
    ],
    say: "I'll return early for the empty array so the rest of the function can assume one item.",
  },
  {
    number: 8, id: "exits-py", title: "break, continue, return", language: "python", topic: "Loops and choices",
    summary: "continue skips to the next item, break leaves the loop, return leaves the whole function. A for loop's else runs only when no break happened.",
    useWhen: [
      "Skip bad items but keep going → continue",
      "Stop the loop at a condition → break",
      "Found the answer inside a function → return",
      "Searched everything and found nothing → for ... else",
    ],
    code: [
      { language: "python", source: `nums = [5, -1, 8, 120, 3]
total = 0
for n in nums:
    if n < 0:
        continue      # skip this one
    if n > 99:
        break         # stop the loop
    total += n
print(total)  # 13

def first_negative(nums):
    for i, n in enumerate(nums):
        if n < 0:
            return i  # leave the function
    return -1

print(first_negative(nums))  # 1

for n in [2, 4, 6]:
    if n % 2:
        print("found odd")
        break
else:
    print("no odd numbers")  # no break happened` },
    ],
    tips: [
      "break leaves only the innermost loop. To leave nested loops, put them in a function and return.",
      "Returning from inside a loop is the cleanest search.",
    ],
    watchOut: [
      "Code after return never runs.",
      "for ... else confuses people. Say out loud that else means no break.",
    ],
    say: "I return as soon as I find it, so the loop never does extra work.",
  },
  {
    number: 9, id: "exits-js", title: "break, continue, return", language: "javascript", topic: "Loops and choices",
    summary: "continue, break, and return work as in Python. forEach is the exception: break is a syntax error there, and return only skips one item.",
    useWhen: [
      "Skip bad items → continue",
      "Stop at a condition → break",
      "Found the answer → return",
      "Any item matches? → some(), which stops early",
    ],
    code: [
      { language: "javascript", source: `const nums = [5, -1, 8, 120, 3];
let total = 0;
for (const n of nums) {
  if (n < 0) continue; // skip this one
  if (n > 99) break;   // stop the loop
  total += n;
}
console.log(total); // 13

function firstNegative(nums) {
  for (const [i, n] of nums.entries()) {
    if (n < 0) return i;
  }
  return -1;
}
console.log(firstNegative(nums)); // 1

console.log(nums.some(n => n > 99));      // true, stops early
console.log(nums.findIndex(n => n < 0));  // 1` },
    ],
    tips: [
      "Labels (outer: for ...) can break nested loops, but a function with return reads better.",
      "some, find, and findIndex stop at the first match.",
    ],
    watchOut: [
      "break inside forEach is a syntax error.",
      "return inside a forEach callback only ends that one call.",
    ],
    say: "I need to stop early, so I'll use for...of instead of forEach.",
  },
  {
    number: 10, id: "helpers-py", title: "Comprehensions and shortcuts", language: "python", topic: "Loops and choices",
    summary: "Comprehensions and built-ins are one-line versions of common loops: transform, filter, check, and summarize.",
    useWhen: [
      "New list from each item → [f(x) for x in xs]",
      "Keep some items → [x for x in xs if ok(x)]",
      "Any or all items match → any() / all()",
      "First match or a default → next(..., None)",
    ],
    code: [
      { language: "python", source: `nums = [3, 8, 1, 6]

doubled = [n * 2 for n in nums]           # map
evens = [n for n in nums if n % 2 == 0]   # filter
squares = {n: n * n for n in nums}        # dict
print(doubled)  # [6, 16, 2, 12]
print(evens)    # [8, 6]
print(squares)  # {3: 9, 8: 64, 1: 1, 6: 36}

print(any(n > 7 for n in nums))   # True
print(all(n > 0 for n in nums))   # True
print(next((n for n in nums if n > 5), None))  # 8
print(sum(nums), min(nums), max(nums))         # 18 1 8
print(sorted(nums, reverse=True))              # [8, 6, 3, 1]` },
    ],
    tips: [
      "Read a comprehension as: expression, for item in items, if condition.",
      "any() and all() stop as soon as the answer is known.",
      "Use a set comprehension {x for x in xs} for unique values.",
    ],
    watchOut: [
      "Don't use a comprehension just to print or append; use a plain loop.",
      "Two nested fors in one comprehension get hard to read. Use a loop.",
    ],
    say: "A comprehension is clearer here because I'm only transforming each item.",
  },
  {
    number: 11, id: "helpers-js", title: "map, filter, forEach", language: "javascript", topic: "Loops and choices",
    summary: "Array methods replace common loops. map and filter return new arrays; find, some, and every stop early; forEach returns nothing and cannot stop.",
    useWhen: [
      "Transform each item → map",
      "Keep some items → filter",
      "First match → find",
      "Any or all match → some / every",
      "Combine into one value → reduce, or a plain loop",
    ],
    code: [
      { language: "javascript", source: `const nums = [3, 8, 1, 6];
console.log(nums.map(n => n * 2));          // [ 6, 16, 2, 12 ]
console.log(nums.filter(n => n % 2 === 0)); // [ 8, 6 ]
console.log(nums.find(n => n > 5));         // 8
console.log(nums.some(n => n > 7));         // true
console.log(nums.every(n => n > 0));        // true
console.log(nums.reduce((sum, n) => sum + n, 0)); // 18
console.log(nums.includes(6));              // true
console.log(nums.findIndex(n => n === 1));  // 2` },
    ],
    tips: [
      "Always give reduce a starting value, like 0.",
      "If a reduce gets hard to read, write a for...of loop instead.",
      "map and filter do not change the original array.",
    ],
    watchOut: [
      "An arrow function with braces needs return: n => { return n * 2; }.",
      "forEach returns undefined, so you cannot chain after it.",
    ],
    say: "map keeps one result per item, so it's the right tool for transforming the list.",
  },
  {
    number: 12, id: "collection-py", title: "Which collection?", language: "python", topic: "Collections",
    summary: "Pick the container by what you do most: keep order (list), look up by key (dict), check membership (set), or keep a small fixed group (tuple).",
    useWhen: [
      "In order, duplicates allowed → list",
      "Look up by name or ID → dict",
      "Seen it before? Unique values? → set",
      "Fixed pair, or a dict key → tuple",
      "First in, first out → collections.deque",
    ],
    code: [
      { language: "python", source: `from collections import Counter, deque

steps = ["login", "search", "buy"]   # list: order
prices = {"tea": 3, "cake": 5}       # dict: look up by key
seen = {"a@x.io"}                    # set: membership
point = (2, 3)                       # tuple: fixed pair

steps.append("logout")
print(prices.get("pie", 0))   # 0
print("a@x.io" in seen)       # True
visited = {point}             # tuples can go in a set
print((2, 3) in visited)      # True

stack = [1, 2]
stack.append(3)
print(stack.pop())            # 3: last in, first out

queue = deque([1, 2])
queue.append(3)
print(queue.popleft())        # 1: first in, first out

print(Counter("banana").most_common(1))  # [('a', 3)]` },
    ],
    tips: [
      "x in set and d[key] are O(1). x in list is O(n).",
      "dict keeps insertion order. set does not.",
      "Use dict.get(key, default) to avoid KeyError.",
    ],
    watchOut: [
      "{} is an empty dict. An empty set is set().",
      "list.pop(0) is O(n). Use deque.popleft() for queues.",
      "Lists cannot be dict keys or set members. Use tuples.",
    ],
    say: "I'll use a set for the IDs I've seen, because I check membership on every item.",
  },
  {
    number: 13, id: "collection-js", title: "Which collection?", language: "javascript", topic: "Collections",
    summary: "Array for order, Map for lookup by key, Set for membership. Plain objects suit fixed string keys like settings. There is no tuple; use a string key.",
    useWhen: [
      "In order → Array",
      "Look up by any key type → Map",
      "Fixed string keys → object",
      "Seen it? Unique? → Set",
      "Pair as a key → string such as \"2,3\"",
    ],
    code: [
      { language: "javascript", source: `const steps = ["login", "search"];       // Array: order
const prices = new Map([["tea", 3]]);    // Map: lookup
const config = { retries: 3 };           // object: fixed keys
const seen = new Set(["a@x.io"]);        // Set: membership

steps.push("buy");
console.log(prices.get("pie") ?? 0);     // 0
console.log(seen.has("a@x.io"));         // true
console.log(config.retries);             // 3

const visited = new Set();
visited.add(\`\${2},\${3}\`);                // pair as a string key
console.log(visited.has("2,3"));         // true

const queue = [1, 2, 3];
let head = 0;
console.log(queue[head++]);              // 1, without shift()
console.log(steps.length, prices.size, seen.size); // 3 1 1` },
    ],
    tips: [
      "Map and Set keep insertion order.",
      "Arrays use .length; Map and Set use .size.",
      "new Set(array) removes duplicates; [...set] turns it back into an array.",
    ],
    watchOut: [
      "Object keys become strings, so obj[1] and obj[\"1\"] are the same key.",
      "shift() is O(n). Use a head index for a big queue.",
      "A Set of arrays compares by reference, so [1, 2] is not found. Use string keys.",
    ],
    say: "I'll use a Map because the keys are numbers and I need the count of keys.",
  },
  {
    number: 14, id: "big-o", title: "How fast?", language: "any", topic: "Collections",
    summary: "Big O says how the work grows as the input grows. The classic improvement is replacing a search inside a loop with a set or map lookup.",
    useWhen: [
      "O(1): key lookup, set check, a[i]: same time at any size",
      "O(n): one pass, or searching a list",
      "O(n log n): sorting",
      "O(n²): a loop inside a loop over the same data",
      "O(log n): halving each step, like binary search",
    ],
    code: [
      { language: "python", source: `def has_duplicate_slow(nums):     # O(n²) time, O(1) memory
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] == nums[j]:
                return True
    return False

def has_duplicate(nums):          # O(n) time, O(n) memory
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False

print(has_duplicate_slow([3, 1, 3]))  # True
print(has_duplicate([3, 1, 3]))       # True` },
      { language: "javascript", source: `function hasDuplicate(nums) {   // O(n) time, O(n) memory
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
console.log(hasDuplicate([3, 1, 3])); // true
console.log(hasDuplicate([1, 2]));    // false` },
    ],
    tips: [
      "Say time and memory: O(n) time, O(n) extra memory.",
      "At n = 1,000, one pass is about 1,000 steps; a loop in a loop is about 1,000,000.",
      "Big O ignores constants: two passes is still O(n).",
    ],
    watchOut: [
      "x in list inside a loop is a hidden O(n²).",
      "Sorting first costs O(n log n). Say it when you do it.",
    ],
    say: "The nested loop is O(n²); with a set it's one pass, O(n) time and O(n) memory.",
  },
  {
    number: 15, id: "count-py", title: "Count pattern", language: "python", topic: "Collections",
    summary: "Counting is the most common dict pattern: start each key at 0 and add 1. Counter does it in one line and finds the most common.",
    useWhen: [
      "How many times does each item appear?",
      "Most common word or number",
      "Anagram or duplicate checks",
    ],
    code: [
      { language: "python", source: `from collections import Counter, defaultdict

words = ["a", "b", "a", "c", "a"]

counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1
print(counts)  # {'a': 3, 'b': 1, 'c': 1}

counts = defaultdict(int)     # missing keys start at 0
for w in words:
    counts[w] += 1
print(dict(counts))  # {'a': 3, 'b': 1, 'c': 1}

c = Counter(words)
print(c.most_common(1))  # [('a', 3)]
print(c["z"])            # 0: missing keys count as 0
print(Counter("listen") == Counter("silent"))  # True` },
    ],
    tips: [
      "Show the dict version first, then mention Counter as the shortcut.",
      "Comparing two Counters checks anagrams in O(n).",
    ],
    watchOut: [
      "counts[w] += 1 on a plain dict raises KeyError for a new key. Use get or defaultdict.",
    ],
    say: "I'll count with a dict in one pass, which is O(n).",
  },
  {
    number: 16, id: "count-js", title: "Count pattern", language: "javascript", topic: "Collections",
    summary: "Use a Map from item to count. ?? 0 starts a missing key at zero.",
    useWhen: [
      "How many times does each item appear?",
      "Most common value",
      "Anagram or duplicate checks",
    ],
    code: [
      { language: "javascript", source: `const words = ["a", "b", "a", "c", "a"];
const counts = new Map();
for (const w of words) {
  counts.set(w, (counts.get(w) ?? 0) + 1);
}
console.log(counts); // Map(3) { 'a' => 3, 'b' => 1, 'c' => 1 }

let best = null;
for (const [word, n] of counts) {
  if (best === null || n > best[1]) best = [word, n];
}
console.log(best); // [ 'a', 3 ]

const sorted = [...counts].sort((x, y) => y[1] - x[1]);
console.log(sorted[0]); // [ 'a', 3 ]` },
    ],
    tips: [
      "[...map] gives [key, value] pairs you can sort.",
      "Finding the max in one pass is O(n); sorting is O(n log n).",
    ],
    watchOut: [
      "counts.get(w) + 1 is NaN for a new key. Use ?? 0.",
      "A plain object turns number keys into strings.",
    ],
    say: "One pass to count into a Map, then one pass to find the biggest.",
  },
  {
    number: 17, id: "two-sum-py", title: "Two Sum", language: "python", topic: "Collections",
    summary: "For each number, the partner you need is target minus that number. A dict of numbers already seen answers do I have that partner in O(1).",
    useWhen: [
      "Find a pair that adds up to a target",
      "Any problem that asks have I seen X before",
    ],
    code: [
      { language: "python", source: `def two_sum(nums, target):
    seen = {}                      # number -> index
    for i, n in enumerate(nums):
        need = target - n
        if need in seen:
            return [seen[need], i]
        seen[n] = i                # store after checking
    return None

print(two_sum([2, 7, 11, 15], 9))  # [0, 1]
print(two_sum([3, 3], 6))          # [0, 1]
print(two_sum([1, 2], 9))          # None` },
    ],
    tips: [
      "Check before storing, so one number never pairs with itself.",
      "Brute force compares every pair: O(n²). The dict version is O(n) time and O(n) memory.",
    ],
    watchOut: [
      "Ask what to return when there is no pair.",
      "Ask whether the same index can be used twice (usually no).",
    ],
    say: "I trade O(n) memory for one pass: each partner is a single dict lookup.",
  },
  {
    number: 18, id: "two-sum-js", title: "Two Sum", language: "javascript", topic: "Collections",
    summary: "Same idea with a Map from number to index. Check for the partner before storing the current number.",
    useWhen: [
      "Find a pair that adds up to a target",
      "Have I seen X before?",
    ],
    code: [
      { language: "javascript", source: `function twoSum(nums, target) {
  const seen = new Map();          // number -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);          // store after checking
  }
  return null;
}

console.log(twoSum([2, 7, 11, 15], 9)); // [ 0, 1 ]
console.log(twoSum([3, 3], 6));         // [ 0, 1 ]
console.log(twoSum([1, 2], 9));         // null` },
    ],
    tips: [
      "Use seen.has(need), not seen.get(need), because index 0 is falsy.",
      "O(n) time, O(n) memory.",
    ],
    watchOut: [
      "if (seen.get(need)) fails when the partner is at index 0.",
    ],
    say: "A Map from number to index makes each partner check O(1).",
  },
  {
    number: 19, id: "sort-py", title: "Group and sort", language: "python", topic: "Collections",
    summary: "Group with a dict of lists keyed by something computed. Sort with a key function; a tuple key sorts by several rules.",
    useWhen: [
      "Group anagrams, or items by category",
      "Sort by count, then by name",
      "Need a sorted copy (sorted) or sort in place (.sort)",
    ],
    code: [
      { language: "python", source: `from collections import defaultdict

words = ["eat", "tea", "tan", "ate", "nat"]
groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)
print(list(groups.values()))
# [['eat', 'tea', 'ate'], ['tan', 'nat']]

people = [("bo", 31), ("ana", 31), ("cy", 25)]
print(sorted(people, key=lambda p: (-p[1], p[0])))
# [('ana', 31), ('bo', 31), ('cy', 25)]

nums = [3, 1, 2]
print(sorted(nums), nums)  # [1, 2, 3] [3, 1, 2]
nums.sort()
print(nums)                # [1, 2, 3]` },
    ],
    tips: [
      "-count in the key puts the biggest first; the second part breaks ties.",
      "sorted() returns a new list. .sort() changes the list and returns None.",
    ],
    watchOut: [
      "x = xs.sort() sets x to None.",
      "Sorting costs O(n log n). Say it.",
    ],
    say: "I group by the sorted letters, so all anagrams share one key.",
  },
  {
    number: 20, id: "sort-js", title: "Group and sort", language: "javascript", topic: "Collections",
    summary: "Group with a Map of arrays. Always pass a compare function to sort, because the default compares as text and changes the array.",
    useWhen: [
      "Group anagrams or items by category",
      "Sort numbers → (a, b) => a - b",
      "Sort text → a.localeCompare(b)",
      "Several rules → compare one, then || the next",
    ],
    code: [
      { language: "javascript", source: `const words = ["eat", "tea", "tan", "ate", "nat"];
const groups = new Map();
for (const w of words) {
  const key = [...w].sort().join("");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(w);
}
console.log([...groups.values()]);
// [ [ 'eat', 'tea', 'ate' ], [ 'tan', 'nat' ] ]

console.log([10, 9, 1].sort());                 // [ 1, 10, 9 ]
console.log([10, 9, 1].sort((a, b) => a - b));  // [ 1, 9, 10 ]

const people = [["bo", 31], ["ana", 31], ["cy", 25]];
const ranked = [...people].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
console.log(ranked);
// [ [ 'ana', 31 ], [ 'bo', 31 ], [ 'cy', 25 ] ]` },
    ],
    tips: [
      "Copy first with [...arr] when the caller's array must not change.",
      "toSorted() returns a sorted copy in newer runtimes.",
    ],
    watchOut: [
      "sort() with no compare function puts 10 before 9.",
      "sort() changes the original array.",
    ],
    say: "I'll pass a compare function because the default sort compares strings.",
  },
  {
    number: 21, id: "truthy-py", title: "Empty and missing", language: "python", topic: "Traps",
    summary: "if x asks whether x counts as true. Zero and empty things count as false. Use is None when zero is a real value.",
    useWhen: [
      "Check for empty → if not items",
      "Check for missing → if x is None",
      "Default for missing only → x if x is not None else default",
    ],
    code: [
      { language: "python", source: `for value in [0, "", [], {}, set(), None, "0", [0]]:
    print(repr(value), bool(value))
# 0 False / '' False / [] False / {} False
# set() False / None False / '0' True / [0] True

retries = 0
# or replaces any falsy value, including 0
print(retries or 3)                       # 3
print(3 if retries is None else retries)  # 0` },
    ],
    tips: [
      "Use is None and is not None, not == None.",
      "if not items is the normal empty check for lists, dicts, and strings.",
    ],
    watchOut: [
      "x or default replaces 0 and \"\" too, which is often a bug.",
      "\"0\" and [0] are true: they are not empty.",
    ],
    say: "Zero is a valid value here, so I'll check is None instead of truthiness.",
  },
  {
    number: 22, id: "truthy-js", title: "Empty and missing", language: "javascript", topic: "Traps",
    summary: "JavaScript's false values are 0, \"\", null, undefined, NaN, and false. Unlike Python, [] and {} are true. ?? replaces only null and undefined.",
    useWhen: [
      "Empty array → arr.length === 0",
      "Missing value → x == null (null or undefined)",
      "Default only when missing → x ?? fallback",
    ],
    code: [
      { language: "javascript", source: `const values = [["0", 0], ['""', ""], ["null", null],
  ["undefined", undefined], ["NaN", NaN],
  ["[]", []], ["{}", {}], ['"0"', "0"]];
for (const [label, v] of values) console.log(label, Boolean(v));
// 0 false / "" false / null false / undefined false
// NaN false / [] true / {} true / "0" true

const retries = 0;
console.log(retries || 3);  // 3: || replaces any falsy value
console.log(retries ?? 3);  // 0: ?? replaces only null/undefined
console.log(null == undefined, null === undefined); // true false
console.log([].length === 0); // true` },
    ],
    tips: [
      "Use === everywhere; the one common exception is x == null to catch both null and undefined.",
      "Optional chaining a?.b returns undefined instead of throwing when a is missing.",
    ],
    watchOut: [
      "if (items) is always true for an array.",
      "|| replaces 0, which breaks counts and ports.",
    ],
    say: "I'll use ?? so a real zero isn't replaced by the default.",
  },
  {
    number: 23, id: "traps-py", title: "Classic traps", language: "python", topic: "Traps",
    summary: "Four Python bugs interviewers like to spot: shared default lists, repeated rows, round half to even, and float comparisons.",
    useWhen: [
      "Writing a function with a list or dict default",
      "Building a 2D grid",
      "Rounding averages",
      "Comparing decimals",
    ],
    code: [
      { language: "python", source: `def add_tag(tag, tags=[]):         # bug: one shared list
    tags.append(tag)
    return tags

print(add_tag("a"), add_tag("b"))  # ['a', 'b'] ['a', 'b']

def add_tag_fixed(tag, tags=None):
    tags = [] if tags is None else tags
    tags.append(tag)
    return tags

print(add_tag_fixed("a"), add_tag_fixed("b"))  # ['a'] ['b']

grid = [[0] * 3] * 3
grid[0][0] = 1
print(grid[1][0])  # 1: three references to one row
grid = [[0] * 3 for _ in range(3)]
grid[0][0] = 1
print(grid[1][0])  # 0

print(round(22.5), round(23.5))  # 22 24: half to even
print(0.1 + 0.2 == 0.3)          # False
print(abs(0.1 + 0.2 - 0.3) < 1e-9)  # True` },
    ],
    tips: [
      "Default arguments are created once, when the function is defined.",
      "Use // for whole-number division; it rounds down.",
    ],
    watchOut: [
      "is compares identity. Use == for values.",
      "Don't add or remove items from a list while looping over it.",
    ],
    say: "I default to None and build a new list inside, so calls don't share state.",
  },
  {
    number: 24, id: "traps-js", title: "Classic traps", language: "javascript", topic: "Traps",
    summary: "JavaScript bugs interviewers like to spot: text sort, string object keys, lost this, rounding, and type coercion.",
    useWhen: [
      "Sorting numbers",
      "Using numbers as object keys",
      "Passing a method as a callback",
      "Mixing strings and numbers",
    ],
    code: [
      { language: "javascript", source: `console.log([10, 9, 1].sort()); // [ 1, 10, 9 ]: compared as text

const byId = {};
byId[1] = "a";
console.log(Object.keys(byId)); // [ '1' ]: keys become strings

class Counter {
  count = 0;
  increment() { this.count += 1; }
}
const c = new Counter();
const loose = c.increment;
try {
  loose();
} catch (e) {
  console.log(e instanceof TypeError); // true: this is lost
}
[1, 2].forEach(() => c.increment()); // arrow keeps this
console.log(c.count); // 2

console.log(Math.round(22.5), Math.round(-22.5)); // 23 -22
console.log(0.1 + 0.2 === 0.3); // false
console.log("5" + 1, "5" - 1);  // 51 4` },
    ],
    tips: [
      "fetch does not throw on 404 or 500. Check response.ok.",
      "Wrap methods in an arrow function or use .bind(obj) before passing them around.",
    ],
    watchOut: [
      "== converts types. Use ===.",
      "Number keys in objects come back as strings. Use a Map.",
    ],
    say: "I'll pass a compare function, because the default sort compares strings.",
  },
  {
    number: 25, id: "fib-py", title: "Fibonacci", language: "python", topic: "Recursion and classes",
    summary: "Each Fibonacci number is the sum of the two before it. Give the loop first. Plain recursion redoes the same work and grows exponentially.",
    useWhen: [
      "Asked for fib(n) or climbing stairs",
      "Any problem where today's answer uses the last two answers",
    ],
    code: [
      { language: "python", source: `from functools import cache

def fib_slow(n):                # exponential: repeats work
    return n if n < 2 else fib_slow(n - 1) + fib_slow(n - 2)

@cache
def fib_memo(n):                # O(n): each n computed once
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

def fib(n):                     # O(n) time, O(1) memory
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print([fib(i) for i in range(8)])  # [0, 1, 1, 2, 3, 5, 8, 13]
print(fib_slow(20), fib_memo(90) == fib(90))  # 6765 True` },
    ],
    tips: [
      "The base case is n < 2: fib(0) = 0 and fib(1) = 1.",
      "Memoization means saving answers so each n is computed once.",
      "Python integers never overflow.",
    ],
    watchOut: [
      "Python stops recursion around 1,000 calls deep.",
      "fib_slow(40) takes seconds; say why before they ask.",
    ],
    say: "The loop keeps only the last two values, so it's O(n) time and O(1) memory.",
  },
  {
    number: 26, id: "fib-js", title: "Fibonacci", language: "javascript", topic: "Recursion and classes",
    summary: "Same loop in JavaScript. Numbers are exact only up to fib(78); use BigInt (numbers ending in n) beyond that.",
    useWhen: [
      "Asked for fib(n) or climbing stairs",
      "Any answer built from the previous two",
    ],
    code: [
      { language: "javascript", source: `function fib(n) {                 // O(n) time, O(1) memory
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

function fibBig(n) {              // exact for any size
  let a = 0n, b = 1n;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

const memo = new Map();
function fibMemo(n) {
  if (n < 2) return n;
  if (!memo.has(n)) memo.set(n, fibMemo(n - 1) + fibMemo(n - 2));
  return memo.get(n);
}

console.log(fib(10), fibMemo(10)); // 55 55
console.log(fib(78));              // 8944394323791464
console.log(fibBig(90));           // 2880067194370816120n` },
    ],
    tips: [
      "[a, b] = [b, a + b] swaps without a temp variable.",
      "BigInt and regular numbers cannot be mixed in math.",
    ],
    watchOut: [
      "fib(79) and above lose precision as regular numbers.",
      "Deep recursion can overflow the call stack.",
    ],
    say: "I'll loop with two variables; recursion without memoization repeats work exponentially.",
  },
  {
    number: 27, id: "class-py", title: "Class shape", language: "python", topic: "Recursion and classes",
    summary: "A class bundles data with the methods that keep it correct. The constructor checks inputs and sets every field. self is the object the method was called on.",
    useWhen: [
      "State that must stay correct across calls: a cache, a client, a counter with a limit",
      "Several functions that share the same data",
    ],
    code: [
      { language: "python", source: `class RunTracker:
    def __init__(self, limit):          # constructor
        if limit < 1:
            raise ValueError("limit must be at least 1")
        self.limit = limit              # fields
        self.active = set()

    def start(self, run_id):            # method
        if len(self.active) >= self.limit:
            return False
        self.active.add(run_id)
        return True

    def finish(self, run_id):
        self.active.discard(run_id)     # no error if missing

    @property
    def available(self):                # read like a field
        return self.limit - len(self.active)

    def __repr__(self):
        return f"RunTracker({len(self.active)}/{self.limit})"

t = RunTracker(1)                       # t is an instance
print(t.start("a"), t.start("b"))       # True False
print(t.available, t)                   # 0 RunTracker(1/1)` },
    ],
    tips: [
      "Set every field in __init__ so readers see the whole state in one place.",
      "Keep each method to one job.",
      "@dataclass writes __init__ and __repr__ for simple data holders.",
    ],
    watchOut: [
      "Forgetting self as the first parameter.",
      "A list default argument is shared by every instance. Default to None.",
    ],
    say: "I validate in the constructor so the object can never be in a bad state.",
  },
  {
    number: 28, id: "class-js", title: "Class shape", language: "javascript", topic: "Recursion and classes",
    summary: "Same shape: constructor sets fields, methods use this. A get accessor reads like a field.",
    useWhen: [
      "State that must stay correct across calls",
      "Several functions that share the same data",
    ],
    code: [
      { language: "javascript", source: `class RunTracker {
  constructor(limit) {                  // constructor
    if (limit < 1) throw new RangeError("limit must be >= 1");
    this.limit = limit;                 // fields
    this.active = new Set();
  }

  start(runId) {                        // method
    if (this.active.size >= this.limit) return false;
    this.active.add(runId);
    return true;
  }

  finish(runId) {
    this.active.delete(runId);
  }

  get available() {                     // read like a field
    return this.limit - this.active.size;
  }
}

const t = new RunTracker(1);            // t is an instance
console.log(t.start("a"), t.start("b")); // true false
console.log(t.available);               // 0` },
    ],
    tips: [
      "Always create instances with new.",
      "Private fields start with #, like #count.",
      "Use an arrow function to pass a method as a callback.",
    ],
    watchOut: [
      "A method passed alone loses this: const f = t.start; f() throws.",
      "Class bodies run in strict mode.",
    ],
    say: "The class keeps the active set and the limit together, so start can enforce the limit.",
  },
  {
    number: 29, id: "error-py", title: "Custom error", language: "python", topic: "Recursion and classes",
    summary: "A custom error class lets callers catch your error by type and read details like an HTTP status, instead of parsing message text.",
    useWhen: [
      "A client that calls an API",
      "Callers need to react differently to different failures",
    ],
    code: [
      { language: "python", source: `class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status

def get_run(run_id):
    if run_id != "r1":
        raise ApiError(404, f"run {run_id} not found")
    return {"id": run_id}

try:
    get_run("r9")
except ApiError as e:
    print(e.status, e)   # 404 run r9 not found
finally:
    print("finally runs either way")` },
    ],
    tips: [
      "Catch the specific type you can handle; let everything else go up.",
      "finally is for cleanup that must always run.",
      "raise ... from err keeps the original cause.",
    ],
    watchOut: [
      "except Exception: pass hides real bugs.",
      "Returning an empty list on failure makes an outage look like no data.",
    ],
    say: "Callers can catch ApiError and check the status, so 404 can mean show an empty state.",
  },
  {
    number: 30, id: "error-js", title: "Custom error", language: "javascript", topic: "Recursion and classes",
    summary: "Extend Error, call super(message), and set name. In a catch, check the type and rethrow anything you can't handle.",
    useWhen: [
      "A client that calls an API",
      "Callers need to tell your error apart from bugs",
    ],
    code: [
      { language: "javascript", source: `class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getRun(id) {
  if (id !== "r1") throw new ApiError(404, \`run \${id} not found\`);
  return { id };
}

try {
  getRun("r9");
} catch (e) {
  if (!(e instanceof ApiError)) throw e; // not ours: rethrow
  console.log(e.status, e.message);      // 404 run r9 not found
} finally {
  console.log("finally runs either way");
}` },
    ],
    tips: [
      "Rethrow errors you don't expect, so real bugs stay visible.",
      "Async functions: wrap await calls in try/catch the same way.",
    ],
    watchOut: [
      "catch (e) {} with nothing inside hides failures.",
      "Throw Error objects, not strings, so you get a stack trace.",
    ],
    say: "I check instanceof and rethrow anything else, so I only handle the failure I expect.",
  },
  {
    number: 31, id: "five-steps", title: "Five steps", language: "any", topic: "Working the problem",
    summary: "Use the same five steps on every problem and say each one out loud. They keep you from freezing and show your thinking even if time runs out.",
    useWhen: [
      "The first minute of any coding question",
      "Whenever you get stuck",
    ],
    code: [
      { language: "python", caption: "Steps 3 to 5 on one problem", source: `# Task: first character that appears only once. "swiss" -> "w"

def first_unique_slow(s):          # step 3: simple way, O(n²)
    for ch in s:
        if s.count(ch) == 1:
            return ch
    return None

def first_unique(s):               # step 4: count once, O(n)
    counts = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in s:
        if counts[ch] == 1:
            return ch
    return None

for s in ["swiss", "", "aabb", "x"]:  # step 5: test edges
    print(repr(s), first_unique(s), first_unique_slow(s))
# 'swiss' w w / '' None None / 'aabb' None None / 'x' x x` },
    ],
    tips: [
      "1. Repeat the task in your own words and work one example.",
      "2. Ask about edge cases: empty, one item, duplicates, case, no answer.",
      "3. Say the simple way first, and its cost.",
      "4. Find the repeated work and remove it, usually with a dict, set, sort, or two pointers.",
      "5. Walk your example through the code, then run the edge cases.",
    ],
    watchOut: [
      "Typing before you have an example usually means solving the wrong problem.",
      "If time runs out, say the next test you would add.",
    ],
    say: "Let me start with a simple version, then remove the repeated work.",
  },
  {
    number: 32, id: "edge-cases", title: "Edge cases checklist", language: "any", topic: "Working the problem",
    summary: "Run these inputs before you say done. Most bugs live at the edges, not in the normal case.",
    useWhen: [
      "Step 2: ask about them",
      "Step 5: test them",
    ],
    code: [
      { language: "python", source: `def largest(nums):
    if not nums:
        return None
    best = nums[0]          # not 0: all values may be negative
    for n in nums[1:]:
        if n > best:
            best = n
    return best

cases = [([], None), ([7], 7), ([2, 2], 2),
         ([-5, -1], -1), ([3, 2, 1], 3)]
for nums, want in cases:
    print(nums, largest(nums) == want)  # all True` },
    ],
    tips: [
      "Empty input",
      "One item",
      "Duplicates",
      "Zero or negative numbers",
      "Already sorted, or reversed",
      "No answer: what should it return?",
      "Very large input: does it still fit the time limit?",
    ],
    watchOut: [
      "Starting best at 0 breaks when every number is negative.",
    ],
    say: "Let me run the empty case and a single item before I call it done.",
  },
  {
    number: 33, id: "hints", title: "Task words → tool", language: "any", topic: "Working the problem",
    summary: "Certain words in a task point to a known approach. Say the hint out loud, then check it against your example.",
    useWhen: [
      "count, duplicates, seen before → dict or set",
      "pair adds up to a target → dict of numbers seen",
      "sorted input, compare both ends → two pointers",
      "overlapping ranges or meetings → sort by start, then merge",
      "brackets, undo, most recent → stack",
      "k items in a row, best stretch → sliding window",
      "fewest steps on a grid or graph → queue and breadth-first search",
    ],
    code: [
      { language: "python", caption: "Sliding window", source: `def max_window_sum(nums, k):         # sliding window
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]   # add new, drop oldest
        best = max(best, window)
    return best

print(max_window_sum([2, 1, 5, 1, 3, 2], 3))  # 9` },
      { language: "javascript", caption: "Stack", source: `function balanced(s) {                // stack
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if ("([{".includes(ch)) stack.push(ch);
    else if (ch in pairs && stack.pop() !== pairs[ch]) {
      return false;
    }
  }
  return stack.length === 0;
}
console.log(balanced("([]{})"), balanced("(]")); // true false` },
    ],
    tips: [
      "Sorting first is often the hint itself: it costs O(n log n) and unlocks two pointers or merging.",
      "If you need the k largest, think heap.",
    ],
    watchOut: [
      "A hint is a guess. Check it on your example before committing.",
    ],
    say: "Overlapping ranges usually means sort by start, then one pass to merge.",
  },
  {
    number: 34, id: "say-why", title: "Say why", language: "any", topic: "Working the problem",
    summary: "Name the tool and the reason in one sentence before you type. Interviewers grade the reasoning as much as the code.",
    useWhen: [
      "Every time you choose a loop, a collection, or an approach",
    ],
    code: [],
    tips: [
      "\"A set, because I check seen-before on every item and a set does that in O(1).\"",
      "\"A dict from number to index, so finding the partner is one lookup instead of a second loop.\"",
      "\"A while loop, because I stop when the pointers meet, not after a fixed count.\"",
      "\"A loop instead of recursion, so it's O(n) and can't hit the recursion limit.\"",
      "\"I'll handle the empty input first and return early, so the main loop has no special cases.\"",
      "\"This is O(n) time and O(n) extra memory for the dict.\"",
    ],
    watchOut: [
      "\"I always use dicts\" is a habit, not a reason. Name the operation it makes fast.",
    ],
    say: "I'll use a set because I check membership on every item.",
  },
  {
    number: 35, id: "terms", title: "Terms", language: "any", topic: "Working the problem",
    summary: "Words interviewers use without explaining them, in plain English.",
    useWhen: [
      "When a word in the question doesn't land, glance here",
    ],
    code: [],
    tips: [
      "Iterable: anything a for loop can walk: list, string, dict, set, range.",
      "Iteration: one trip through the loop body.",
      "Mutable: can change after it's made (list, dict, set). Immutable: cannot (tuple, string, number).",
      "Hashable: can be a dict key or set member.",
      "Guard clause: an early if that handles a bad case and returns.",
      "Off-by-one: a loop that runs one time too many or too few.",
      "Edge case: an input at the limits: empty, one item, duplicates, negatives.",
      "Brute force: the simple, try-everything version.",
      "Memoization: saving answers so the same input is never computed twice.",
      "Instance: one object built from a class. Constructor: the code that sets it up.",
      "Side effect: a change outside the function, like printing or editing a shared list.",
      "Idempotent: safe to repeat; doing it twice has the same effect as once.",
    ],
    watchOut: [
      "If you don't know a word, ask. \"Do you mean X?\" is a strong answer.",
    ],
  },
  {
    number: 36, id: "api-py", title: "API client shape", language: "python", topic: "Full-stack code",
    summary: "Lay down a skeleton the interviewer can follow: constants, an error class, a client that receives its HTTP function, small methods, then call it and handle errors.",
    useWhen: [
      "Fetch data from an API and do something with it",
      "Any task where the network may fail",
    ],
    code: [
      { language: "python", source: `from urllib.parse import quote

BASE_URL = "https://api.example.test"

class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status

class RunsClient:
    def __init__(self, http_get, base_url=BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.http_get = http_get        # passed in: easy to fake

    def get_json(self, path):
        status, body = self.http_get(self.base_url + path)
        if status != 200:
            raise ApiError(status, f"GET {path}: {status}")
        return body

    def runs_for(self, agent):
        return self.get_json(f"/agents/{quote(agent)}/runs")

def fake_get(url):
    if url.endswith("/billing/runs"):
        return 200, [{"id": "r1"}]
    return 404, None

client = RunsClient(fake_get)
print(client.runs_for("billing"))   # [{'id': 'r1'}]
try:
    client.runs_for("missing")
except ApiError as e:
    print("handled", e.status)      # handled 404` },
    ],
    tips: [
      "Passing the HTTP function in (dependency injection) lets a test use a fake with no network.",
      "Keep the status on the error so callers can branch on it.",
      "Add a timeout to every real request.",
    ],
    watchOut: [
      "urllib raises HTTPError for 4xx and 5xx; requests only raises when you call raise_for_status().",
      "Don't catch everything and return []: an outage then looks like no data.",
    ],
    say: "I pass the HTTP function in so I can test the client with a fake, including the 404 path.",
  },
  {
    number: 37, id: "api-js", title: "API client shape", language: "javascript", topic: "Full-stack code",
    summary: "Same skeleton with fetch passed in. Check response.ok yourself, because fetch only throws on network failure.",
    useWhen: [
      "Fetch data from an API and do something with it",
      "Any task where the network may fail",
    ],
    code: [
      { language: "javascript", source: `const BASE_URL = "https://api.example.test";

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class RunsClient {
  constructor(fetchFn = fetch, baseUrl = BASE_URL) {
    this.fetchFn = fetchFn;           // passed in: easy to fake
    this.baseUrl = baseUrl.replace(/\\/$/, "");
  }

  async getJson(path) {
    const res = await this.fetchFn(this.baseUrl + path, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new ApiError(res.status, \`GET \${path}: \${res.status}\`);
    }
    return res.json();
  }

  runsFor(agent) {
    const name = encodeURIComponent(agent);
    return this.getJson(\`/agents/\${name}/runs\`);
  }
}

const fakeFetch = async url => url.endsWith("/billing/runs")
  ? new Response(JSON.stringify([{ id: "r1" }]))
  : new Response(null, { status: 404 });

const client = new RunsClient(fakeFetch);
console.log(await client.runsFor("billing")); // [ { id: 'r1' } ]
try {
  await client.runsFor("missing");
} catch (e) {
  if (!(e instanceof ApiError)) throw e;
  console.log("handled", e.status); // handled 404
}` },
    ],
    tips: [
      "AbortSignal.timeout(ms) stops waiting after a limit.",
      "encodeURIComponent for anything you put in a URL.",
      "Promise.all runs independent requests at the same time.",
    ],
    watchOut: [
      "fetch resolves on 404 and 500. Without the ok check, you parse an error page as data.",
      "Forgetting await returns a Promise, not the data.",
    ],
    say: "fetch doesn't throw on a 404, so I check res.ok and throw an ApiError with the status.",
  },
  {
    number: 38, id: "paginate-py", title: "Paginate", language: "python", topic: "Full-stack code",
    summary: "Follow the cursor until the API stops returning one. A generator hands out items one at a time, so the caller can stop early.",
    useWhen: [
      "The API returns items plus a next cursor or page token",
      "Results too big for one response",
    ],
    code: [
      { language: "python", source: `def iter_runs(client):
    cursor = None
    while True:
        page = client.get_page(cursor)
        yield from page["items"]
        cursor = page.get("next")
        if cursor is None:
            return

class FakeClient:
    pages = {None: {"items": [1, 2], "next": "p2"},
             "p2": {"items": [], "next": "p3"},  # empty page
             "p3": {"items": [3], "next": None}}
    def get_page(self, cursor):
        return self.pages[cursor]

print(list(iter_runs(FakeClient())))  # [1, 2, 3]` },
    ],
    tips: [
      "Stop on a missing cursor, never on an empty or short page.",
      "Encode the cursor when you put it in a URL.",
      "Guard against a server that repeats a cursor: track seen cursors or cap pages.",
    ],
    watchOut: [
      "Collecting every page into one list can run out of memory. Process items as they arrive.",
    ],
    say: "The cursor is the API telling me there's more, so I loop until it's missing.",
  },
  {
    number: 39, id: "paginate-js", title: "Paginate", language: "javascript", topic: "Full-stack code",
    summary: "An async generator yields each item while it follows the cursor. Consume it with for await.",
    useWhen: [
      "The API returns items plus a next cursor",
      "Results too big for one response",
    ],
    code: [
      { language: "javascript", source: `async function* allRuns(client) {
  let cursor = null;
  do {
    const page = await client.getPage(cursor);
    yield* page.items;
    cursor = page.next ?? null;
  } while (cursor !== null);
}

const pages = {
  start: { items: [1, 2], next: "p2" },
  p2: { items: [], next: "p3" },       // empty, not the end
  p3: { items: [3], next: null },
};
const fakeClient = {
  getPage: async cursor => pages[cursor ?? "start"],
};

const seen = [];
for await (const run of allRuns(fakeClient)) seen.push(run);
console.log(seen); // [ 1, 2, 3 ]` },
    ],
    tips: [
      "for await (const x of gen) reads an async generator.",
      "do...while fits because you always fetch the first page.",
    ],
    watchOut: [
      "Stopping on an empty page misses later pages.",
      "Forgetting await inside the loop gives Promises instead of pages.",
    ],
    say: "I keep fetching while there's a next cursor and yield items as they arrive.",
  },
];

export function interviewNoteByNumber(number: number): InterviewNote | undefined {
  return interviewNotes.find(note => note.number === number);
}
