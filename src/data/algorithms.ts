import { extraAlgorithmQuestions } from './algorithms-extra';

export type AlgorithmLanguage = 'python' | 'javascript' | 'go' | 'php';
export type AlgorithmQuestion = {
  id: string; title: string; url: string; difficulty: 'Easy' | 'Medium' | 'Hard';
  pattern: string; summary: string; example: {input: string; output: string};
  complexity: {time: string; space: string; plain: string};
  analogy: string; walkthrough: string[]; concepts: string[];
  solutions: Record<AlgorithmLanguage, {code: string; explanation: string[]}>;
};
export const learningConcepts = [
  {id:'ternary', label:'Ternary syntax', explanation:'A ternary is an if/else that produces one value. These solutions use explicit branches instead.', analogy:'Like choosing an HTTP status after checking whether a resource exists.', steps:['Read the condition first.','If it is true, take the first value. Otherwise take the second.','Rewrite it as an if/else with a named result variable before tracing it.']},
  {id:'median', label:'Median', explanation:'Sort the values. The median is the middle value, or the average of the two middle values when the count is even.', analogy:'Line up request latencies from fastest to slowest. The median is the latency in the middle of that queue, not the average of all requests.', steps:['For [2, 5, 11], the middle item is 5.','For [2, 5, 11, 20], the middle pair is 5 and 11. Their average is 8.','An index starts at zero. With 4 items the middle indices are 1 and 2.']},
  {id:'control-flow', label:'Control flow', explanation:'Trace a program as a sequence of state changes: read a value, check a condition, change state, then move to the next iteration.', analogy:'Follow a request through middleware and record what each handler changes.', steps:['Write the current variables before entering the loop.','Evaluate only the next condition. Choose the branch that actually runs.','Write the new variables after that branch. Repeat with a tiny input.']},
  {id:'memoization', label:'Memoization and saved results', explanation:'Memoization caches a function result under its inputs. Bottom-up dynamic programming fills a table of small answers before using them to build bigger answers.', analogy:'An API response cache avoids repeating the same expensive request. A dynamic-programming table is a deliberately filled cache of smaller answers.', steps:['Name exactly what one cached value means.','Choose a key that completely identifies the smaller problem.','Before calculating again, reuse a known answer. For bottom-up code, process dependencies first.']},
  {id:'recursion', label:'Recursion', explanation:'A function solves a smaller version of its own task, then uses that answer. Each call has its own local variables.', analogy:'Walking nested folders: inspect this folder, then run the same folder-inspection job on each child.', steps:['Find the base case where the function stops calling itself.','Draw one call per input item, with its own variables.','Read returned values from the deepest calls back toward the caller.']},
  {id:'pointers', label:'Pointers and moving indices', explanation:'An index names a position in a list. A node reference names an object. Moving either changes what you look at; changing a node link changes the structure.', analogy:'A database foreign key points to another record. Updating a next link is like changing that relationship, not copying the record.', steps:['Label which variables hold values, indices, or node references.','Save any link you still need before replacing it.','Draw a tiny chain or mark the current array positions after each step.']},
  {id:'complexity', label:'Time and space complexity', explanation:'Complexity describes how work and extra memory grow with input size. It is a growth model, not an exact stopwatch reading.', analogy:'Estimate whether doubling a batch doubles the processing work, squares it, or adds only one more lookup step.', steps:['Count full passes, nested passes, and how often an item can move.','O(n) is roughly one unit of work per item; O(n squared) compares many pairs.','O(log n) repeatedly halves the remaining search area. Hash table operations are average constant time, not a worst-case guarantee.']},
];
function answers(python:string, javascript:string, go:string, php:string, note:string): AlgorithmQuestion['solutions'] {
  return {
    python:{code:python, explanation:[note,'Indentation marks each branch and loop body. A return exits the current function.']},
    javascript:{code:javascript, explanation:[note,'Braces mark blocks. Map and Set store lookup state; let names changing state and const keeps a binding fixed.']},
    go:{code:go, explanation:[note,'The code is a complete package for a practice file. A comma-ok map lookup distinguishes an absent key from a stored zero.']},
    php:{code:php, explanation:[note,'Variables start with $. Arrays are used for lists or keyed lookups; object links use ->.']},
  };
}
export const algorithmQuestions: AlgorithmQuestion[] = [
{
id:'two-sum',title:'Two Sum',url:'https://leetcode.com/problems/two-sum/',difficulty:'Easy',pattern:'Hash lookup',summary:'Find two different positions whose values total the target. The input guarantees one matching pair.',example:{input:'nums = [5, 9, 2, 7], target = 11',output:'[1, 2]'},complexity:{time:'O(n) average',space:'O(n)',plain:'Visit each number once and keep an index of values already seen.'},analogy:'A keyed database lookup replaces scanning every earlier row for each new event.',walkthrough:['At 5, look for 6. Not found, so remember 5 at index 0.','At 9, look for 2. Not found, so remember 9 at index 1.','At 2, look for 9. It is stored at index 1. Return indices 1 and 2.'],concepts:['control-flow','complexity'],solutions:answers(
`def twoSum(nums, target):
    seen = {}
    for index, value in enumerate(nums):
        needed = target - value
        if needed in seen:
            return [seen[needed], index]
        seen[value] = index
    return []`,
`function twoSum(nums, target) {
  const seen = new Map();
  for (let index = 0; index < nums.length; index++) {
    const needed = target - nums[index];
    if (seen.has(needed)) return [seen.get(needed), index];
    seen.set(nums[index], index);
  }
  return [];
}`,
`package main
func twoSum(nums []int, target int) []int {
    seen := map[int]int{}
    for index, value := range nums {
        needed := target - value
        previous, exists := seen[needed]
        if exists { return []int{previous, index} }
        seen[value] = index
    }
    return []int{}
}`,
`<?php
function twoSum($nums, $target) {
    $seen = [];
    foreach ($nums as $index => $value) {
        $needed = $target - $value;
        if (array_key_exists($needed, $seen)) {
            return [$seen[$needed], $index];
        }
        $seen[$value] = $index;
    }
    return [];
}`,'Look up the missing value before saving the current position. This prevents using one position twice.')
},
{
id:'contains-duplicate',title:'Contains Duplicate',url:'https://leetcode.com/problems/contains-duplicate/',difficulty:'Easy',pattern:'Set membership',summary:'Report whether an integer appears more than once in the input.',example:{input:'nums = [8, 3, 8]',output:'true'},complexity:{time:'O(n) average',space:'O(n)',plain:'One pass; the lookup set may contain every distinct value.'},analogy:'Deduplicate incoming event IDs before processing the same event again.',walkthrough:['Save 8 in the seen set.','Save 3 in the seen set.','The next 8 is already present, so return true immediately.'],concepts:['control-flow','complexity'],solutions:answers(
`def containsDuplicate(nums):
    seen = set()
    for value in nums:
        if value in seen:
            return True
        seen.add(value)
    return False`,
`function containsDuplicate(nums) {
  const seen = new Set();
  for (const value of nums) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}`,
`package main
func containsDuplicate(nums []int) bool {
    seen := map[int]bool{}
    for _, value := range nums {
        if seen[value] { return true }
        seen[value] = true
    }
    return false
}`,
`<?php
function containsDuplicate($nums) {
    $seen = [];
    foreach ($nums as $value) {
        if (isset($seen[$value])) return true;
        $seen[$value] = true;
    }
    return false;
}`,'The only stored state is whether a value has appeared. No counts or pair comparisons are needed.')
},
{
id:'valid-anagram',title:'Valid Anagram',url:'https://leetcode.com/problems/valid-anagram/',difficulty:'Easy',pattern:'Frequency counts',summary:'Check whether two lowercase English strings contain the same letters with the same counts.',example:{input:'s = "listen", t = "silent"',output:'true'},complexity:{time:'O(n)',space:'O(1)',plain:'Count both strings once. At most 26 letter counters are needed under the stated alphabet.'},analogy:'Reconcile two inventory manifests: order can differ, but item counts must match.',walkthrough:['Different lengths cannot contain the same letter counts.','Add one to the counter for each letter in the first string.','Subtract each letter in the second string; reject a missing or exhausted counter.'],concepts:['control-flow'],solutions:answers(
`def isAnagram(s, t):
    if len(s) != len(t): return False
    counts = {}
    for char in s:
        if char not in counts: counts[char] = 0
        counts[char] += 1
    for char in t:
        if char not in counts or counts[char] == 0: return False
        counts[char] -= 1
    return True`,
`function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Map();
  for (const char of s) {
    if (!counts.has(char)) counts.set(char, 0);
    counts.set(char, counts.get(char) + 1);
  }
  for (const char of t) {
    if (!counts.has(char) || counts.get(char) === 0) return false;
    counts.set(char, counts.get(char) - 1);
  }
  return true;
}`,
`package main
func isAnagram(s string, t string) bool {
    if len(s) != len(t) { return false }
    counts := map[rune]int{}
    for _, char := range s { counts[char]++ }
    for _, char := range t {
        if counts[char] == 0 { return false }
        counts[char]--
    }
    return true
}`,
`<?php
function isAnagram($s, $t) {
    if (strlen($s) !== strlen($t)) return false;
    $counts = [];
    for ($index = 0; $index < strlen($s); $index++) {
        $char = $s[$index];
        if (!isset($counts[$char])) $counts[$char] = 0;
        $counts[$char]++;
    }
    for ($index = 0; $index < strlen($t); $index++) {
        $char = $t[$index];
        if (!isset($counts[$char]) || $counts[$char] === 0) return false;
        $counts[$char]--;
    }
    return true;
}`,'Equal lengths plus successful subtraction means every counter finishes at zero. These versions assume the problem alphabet, not arbitrary Unicode text.')
},
{
id:'valid-parentheses',title:'Valid Parentheses',url:'https://leetcode.com/problems/valid-parentheses/',difficulty:'Easy',pattern:'Stack',summary:'Check whether a sequence of round, square, and curly brackets closes each opening in the correct nesting order.',example:{input:'s = "{[()]}"',output:'true'},complexity:{time:'O(n)',space:'O(n)',plain:'Each bracket enters and leaves the stack at most once.'},analogy:'Nested transactions must close the most recently opened scope first.',walkthrough:['Opening brackets go onto a stack.','A closing bracket must match the last opening bracket.','After all input, the stack must be empty.'],concepts:['control-flow'],solutions:answers(
`def isValid(s):
    openings = {'(': ')', '[': ']', '{': '}'}
    stack = []
    for char in s:
        if char in openings:
            stack.append(openings[char])
        else:
            if not stack: return False
            expected = stack.pop()
            if char != expected: return False
    return len(stack) == 0`,
`function isValid(s) {
  const openings = new Map([['(', ')'], ['[', ']'], ['{', '}']]);
  const stack = [];
  for (const char of s) {
    if (openings.has(char)) {
      stack.push(openings.get(char));
    } else {
      if (stack.length === 0) return false;
      const expected = stack.pop();
      if (char !== expected) return false;
    }
  }
  return stack.length === 0;
}`,
`package main
func isValid(s string) bool {
    openings := map[rune]rune{'(': ')', '[': ']', '{': '}'}
    stack := []rune{}
    for _, char := range s {
        closing, exists := openings[char]
        if exists {
            stack = append(stack, closing)
        } else {
            if len(stack) == 0 { return false }
            expected := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            if char != expected { return false }
        }
    }
    return len(stack) == 0
}`,
`<?php
function isValid($s) {
    $openings = ['(' => ')', '[' => ']', '{' => '}'];
    $stack = [];
    foreach (str_split($s) as $char) {
        if (isset($openings[$char])) {
            $stack[] = $openings[$char];
        } else {
            if (count($stack) === 0) return false;
            $expected = array_pop($stack);
            if ($char !== $expected) return false;
        }
    }
    return count($stack) === 0;
}`,'Store the closing bracket you expect next. The stack is a concrete list of unfinished scopes.')
},
{
id:'best-time-to-buy-and-sell-stock',title:'Best Time to Buy and Sell Stock',url:'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',difficulty:'Easy',pattern:'Running minimum',summary:'Choose one earlier purchase and one later sale to maximize gain. Return zero when no profitable trade exists.',example:{input:'prices = [9, 4, 8, 2, 7]',output:'5'},complexity:{time:'O(n)',space:'O(1)',plain:'Visit each price once and keep two numbers.'},analogy:'A streaming monitor keeps the lowest reading seen and the best improvement since an earlier reading.',walkthrough:['Keep the cheapest earlier price as a candidate purchase.','At each new price, calculate the gain from selling now.','Update the best gain and the cheapest price before continuing.'],concepts:['control-flow','complexity'],solutions:answers(
`def maxProfit(prices):
    cheapest = prices[0]
    best = 0
    for price in prices:
        gain = price - cheapest
        if gain > best: best = gain
        if price < cheapest: cheapest = price
    return best`,
`function maxProfit(prices) {
  let cheapest = prices[0];
  let best = 0;
  for (const price of prices) {
    const gain = price - cheapest;
    if (gain > best) best = gain;
    if (price < cheapest) cheapest = price;
  }
  return best;
}`,
`package main
func maxProfit(prices []int) int {
    cheapest, best := prices[0], 0
    for _, price := range prices {
        gain := price - cheapest
        if gain > best { best = gain }
        if price < cheapest { cheapest = price }
    }
    return best
}`,
`<?php
function maxProfit($prices) {
    $cheapest = $prices[0];
    $best = 0;
    foreach ($prices as $price) {
        $gain = $price - $cheapest;
        if ($gain > $best) $best = $gain;
        if ($price < $cheapest) $cheapest = $price;
    }
    return $best;
}`,'The scan moves forward in time, so a future low price can never become an earlier purchase.')
},
{
id:'valid-palindrome',title:'Valid Palindrome',url:'https://leetcode.com/problems/valid-palindrome/',difficulty:'Easy',pattern:'Two pointers',summary:'Ignore punctuation and letter case, then check whether the remaining ASCII letters and digits read the same in both directions.',example:{input:'s = "Never odd, or even."',output:'true'},complexity:{time:'O(n)',space:'O(n)',plain:'Normalize once, then compare inward. The normalized copy uses extra memory.'},analogy:'Normalize two API identifiers before comparing them; here you compare matching positions from opposite ends.',walkthrough:['Build a lowercase string containing only letters and digits.','Compare its first and last characters.','Move both positions inward. Any mismatch returns false.'],concepts:['pointers','control-flow'],solutions:answers(
`def isPalindrome(s):
    clean = []
    for char in s.lower():
        if char.isalnum(): clean.append(char)
    left, right = 0, len(clean) - 1
    while left < right:
        if clean[left] != clean[right]: return False
        left += 1
        right -= 1
    return True`,
`function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0;
  let right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}`,
`package main
import "strings"
func isPalindrome(s string) bool {
    clean := []byte{}
    lower := strings.ToLower(s)
    for i := 0; i < len(lower); i++ {
        char := lower[i]
        if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') {
            clean = append(clean, char)
        }
    }
    left, right := 0, len(clean)-1
    for left < right {
        if clean[left] != clean[right] { return false }
        left++
        right--
    }
    return true
}`,
`<?php
function isPalindrome($s) {
    $clean = preg_replace('/[^a-z0-9]/', '', strtolower($s));
    $left = 0;
    $right = strlen($clean) - 1;
    while ($left < $right) {
        if ($clean[$left] !== $clean[$right]) return false;
        $left++;
        $right--;
    }
    return true;
}`,'This readable version keeps a normalized copy. A follow-up can skip punctuation in place for constant extra space.')
},
{
id:'binary-search',title:'Binary Search',url:'https://leetcode.com/problems/binary-search/',difficulty:'Easy',pattern:'Halving a sorted range',summary:'Locate a target in a sorted array of unique integers. Return its index, or -1 when absent.',example:{input:'nums = [2, 5, 8, 12, 17], target = 12',output:'3'},complexity:{time:'O(log n)',space:'O(1)',plain:'Each comparison discards roughly half the remaining positions.'},analogy:'Narrow a sorted log by timestamp instead of reading every log line.',walkthrough:['left and right include every position still possible.','Compare the middle value with the target.','Discard the middle and the impossible half. Stop when left passes right.'],concepts:['pointers','control-flow','complexity'],solutions:answers(
`def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        middle = left + (right - left) // 2
        if nums[middle] == target: return middle
        if nums[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    return -1`,
`function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    if (nums[middle] === target) return middle;
    if (nums[middle] < target) left = middle + 1;
    else right = middle - 1;
  }
  return -1;
}`,
`package main
func search(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        middle := left + (right-left)/2
        if nums[middle] == target { return middle }
        if nums[middle] < target { left = middle+1 } else { right = middle-1 }
    }
    return -1
}`,
`<?php
function search($nums, $target) {
    $left = 0;
    $right = count($nums) - 1;
    while ($left <= $right) {
        $middle = $left + intdiv($right - $left, 2);
        if ($nums[$middle] === $target) return $middle;
        if ($nums[$middle] < $target) $left = $middle + 1;
        else $right = $middle - 1;
    }
    return -1;
}`,'middle is a position, not a median calculation. The +1 and -1 guarantee that the search range shrinks.')
},
{
id:'merge-sorted-array',title:'Merge Sorted Array',url:'https://leetcode.com/problems/merge-sorted-array/',difficulty:'Easy',pattern:'Two pointers from the end',summary:'Merge two sorted integer lists into the first array, which has spare trailing slots. Only its first m values are initially meaningful.',example:{input:'nums1 = [2, 6, 0, 0], m = 2, nums2 = [1, 5], n = 2',output:'nums1 becomes [1, 2, 5, 6]'},complexity:{time:'O(m + n)',space:'O(1)',plain:'Move each value into one final slot without building another result array.'},analogy:'Merge two sorted event streams into a buffer. Write from the back so unread records are not overwritten.',walkthrough:['Start at the last real value in each array and the last destination slot.','Write whichever current value is larger, then move its pointer left.','Continue until the second array is exhausted. Remaining first-array values are already placed.'],concepts:['pointers','control-flow'],solutions:answers(
`def merge(nums1, m, nums2, n):
    first, second, write = m - 1, n - 1, m + n - 1
    while second >= 0:
        if first >= 0 and nums1[first] > nums2[second]:
            nums1[write] = nums1[first]
            first -= 1
        else:
            nums1[write] = nums2[second]
            second -= 1
        write -= 1`,
`function merge(nums1, m, nums2, n) {
  let first = m - 1;
  let second = n - 1;
  let write = m + n - 1;
  while (second >= 0) {
    if (first >= 0 && nums1[first] > nums2[second]) {
      nums1[write] = nums1[first];
      first--;
    } else {
      nums1[write] = nums2[second];
      second--;
    }
    write--;
  }
}`,
`package main
func merge(nums1 []int, m int, nums2 []int, n int) {
    first, second, write := m-1, n-1, m+n-1
    for second >= 0 {
        if first >= 0 && nums1[first] > nums2[second] {
            nums1[write] = nums1[first]
            first--
        } else {
            nums1[write] = nums2[second]
            second--
        }
        write--
    }
}`,
`<?php
function merge(&$nums1, $m, $nums2, $n) {
    $first = $m - 1;
    $second = $n - 1;
    $write = $m + $n - 1;
    while ($second >= 0) {
        if ($first >= 0 && $nums1[$first] > $nums2[$second]) {
            $nums1[$write] = $nums1[$first];
            $first--;
        } else {
            $nums1[$write] = $nums2[$second];
            $second--;
        }
        $write--;
    }
}`,'The result is a mutation, not a returned array. PHP uses & on nums1 so the caller sees those writes.')
},
{
id:'reverse-linked-list',title:'Reverse Linked List',url:'https://leetcode.com/problems/reverse-linked-list/',difficulty:'Easy',pattern:'Link rewiring',summary:'Reverse the next links of a singly linked chain and return its new first node.',example:{input:'head = 4 -> 8 -> 12',output:'12 -> 8 -> 4'},complexity:{time:'O(n)',space:'O(1)',plain:'Rewire each node once while keeping three references.'},analogy:'Reverse a chain of related records by changing their next-record links, not their stored values.',walkthrough:['Save the next node before modifying the current link.','Point current.next toward the already reversed prefix.','Advance previous and current. When current is empty, previous is the new head.'],concepts:['pointers','control-flow'],solutions:answers(
`class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverseList(head):
    previous = None
    current = head
    while current is not None:
        next_node = current.next
        current.next = previous
        previous = current
        current = next_node
    return previous`,
`class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
function reverseList(head) {
  let previous = null;
  let current = head;
  while (current !== null) {
    const nextNode = current.next;
    current.next = previous;
    previous = current;
    current = nextNode;
  }
  return previous;
}`,
`package main
type ListNode struct { Val int; Next *ListNode }
func reverseList(head *ListNode) *ListNode {
    var previous *ListNode
    current := head
    for current != nil {
        nextNode := current.Next
        current.Next = previous
        previous = current
        current = nextNode
    }
    return previous
}`,
`<?php
class ListNode {
    public $val;
    public $next;
    function __construct($val = 0, $next = null) { $this->val = $val; $this->next = $next; }
}
function reverseList($head) {
    $previous = null;
    $current = $head;
    while ($current !== null) {
        $nextNode = $current->next;
        $current->next = $previous;
        $previous = $current;
        $current = $nextNode;
    }
    return $previous;
}`,'nextNode is a saved route to unfinished work. Without saving it first, changing current.next loses the rest of the chain.')
},
{
id:'merge-two-sorted-lists',title:'Merge Two Sorted Lists',url:'https://leetcode.com/problems/merge-two-sorted-lists/',difficulty:'Easy',pattern:'Two pointers and sentinel',summary:'Combine two sorted linked chains by reusing their nodes, returning one sorted chain.',example:{input:'list1 = 2 -> 7, list2 = 3 -> 6',output:'2 -> 3 -> 6 -> 7'},complexity:{time:'O(m + n)',space:'O(1)',plain:'Advance each input node at most once; reuse the existing nodes.'},analogy:'Merge two chronological streams by repeatedly taking the older current event.',walkthrough:['Create a temporary dummy head to avoid a special case for the first output node.','Attach the smaller current node to the output tail.','When one list ends, attach the entire remaining chain and return dummy.next.'],concepts:['pointers','control-flow'],solutions:answers(
`class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def mergeTwoLists(list1, list2):
    dummy = ListNode()
    tail = dummy
    while list1 is not None and list2 is not None:
        if list1.val <= list2.val:
            tail.next = list1
            list1 = list1.next
        else:
            tail.next = list2
            list2 = list2.next
        tail = tail.next
    if list1 is not None: tail.next = list1
    else: tail.next = list2
    return dummy.next`,
`class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
function mergeTwoLists(list1, list2) {
  const dummy = new ListNode();
  let tail = dummy;
  while (list1 !== null && list2 !== null) {
    if (list1.val <= list2.val) { tail.next = list1; list1 = list1.next; }
    else { tail.next = list2; list2 = list2.next; }
    tail = tail.next;
  }
  if (list1 !== null) tail.next = list1;
  else tail.next = list2;
  return dummy.next;
}`,
`package main
type ListNode struct { Val int; Next *ListNode }
func mergeTwoLists(list1 *ListNode, list2 *ListNode) *ListNode {
    dummy := &ListNode{}
    tail := dummy
    for list1 != nil && list2 != nil {
        if list1.Val <= list2.Val { tail.Next = list1; list1 = list1.Next } else {
            tail.Next = list2; list2 = list2.Next
        }
        tail = tail.Next
    }
    if list1 != nil { tail.Next = list1 } else { tail.Next = list2 }
    return dummy.Next
}`,
`<?php
class ListNode {
    public $val;
    public $next;
    function __construct($val = 0, $next = null) { $this->val = $val; $this->next = $next; }
}
function mergeTwoLists($list1, $list2) {
    $dummy = new ListNode();
    $tail = $dummy;
    while ($list1 !== null && $list2 !== null) {
        if ($list1->val <= $list2->val) { $tail->next = $list1; $list1 = $list1->next; }
        else { $tail->next = $list2; $list2 = $list2->next; }
        $tail = $tail->next;
    }
    if ($list1 !== null) $tail->next = $list1;
    else $tail->next = $list2;
    return $dummy->next;
}`,'The dummy node is not part of the answer. It gives tail a valid starting object before any real node is chosen.')
},
{
id:'maximum-depth-of-binary-tree',title:'Maximum Depth of Binary Tree',url:'https://leetcode.com/problems/maximum-depth-of-binary-tree/',difficulty:'Easy',pattern:'Depth-first traversal',summary:'Count the nodes on the longest root-to-leaf path in a binary tree. An empty tree has depth zero.',example:{input:'root = [7, 3, 9, null, 5] (level order)',output:'3'},complexity:{time:'O(n)',space:'O(h)',plain:'Visit every node. The explicit stack holds pending branches along a path of height h, at most n.'},analogy:'Walk a nested folder tree while carrying the current folder depth as job metadata.',walkthrough:['Push the root together with depth 1.','Pop one node and update the deepest depth seen.','Push each child with depth plus 1. Continue until no jobs remain.'],concepts:['recursion','control-flow'],solutions:answers(
`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def maxDepth(root):
    if root is None: return 0
    stack = [(root, 1)]
    deepest = 0
    while stack:
        node, depth = stack.pop()
        if depth > deepest: deepest = depth
        if node.left is not None: stack.append((node.left, depth + 1))
        if node.right is not None: stack.append((node.right, depth + 1))
    return deepest`,
`class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}
function maxDepth(root) {
  if (root === null) return 0;
  const stack = [[root, 1]];
  let deepest = 0;
  while (stack.length > 0) {
    const [node, depth] = stack.pop();
    if (depth > deepest) deepest = depth;
    if (node.left !== null) stack.push([node.left, depth + 1]);
    if (node.right !== null) stack.push([node.right, depth + 1]);
  }
  return deepest;
}`,
`package main
type TreeNode struct { Val int; Left, Right *TreeNode }
type Visit struct { Node *TreeNode; Depth int }
func maxDepth(root *TreeNode) int {
    if root == nil { return 0 }
    stack := []Visit{{root, 1}}
    deepest := 0
    for len(stack) > 0 {
        visit := stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        if visit.Depth > deepest { deepest = visit.Depth }
        if visit.Node.Left != nil { stack = append(stack, Visit{visit.Node.Left, visit.Depth+1}) }
        if visit.Node.Right != nil { stack = append(stack, Visit{visit.Node.Right, visit.Depth+1}) }
    }
    return deepest
}`,
`<?php
class TreeNode {
    public $val; public $left; public $right;
    function __construct($val = 0, $left = null, $right = null) {
        $this->val = $val; $this->left = $left; $this->right = $right;
    }
}
function maxDepth($root) {
    if ($root === null) return 0;
    $stack = [[$root, 1]];
    $deepest = 0;
    while (count($stack) > 0) {
        [$node, $depth] = array_pop($stack);
        if ($depth > $deepest) $deepest = $depth;
        if ($node->left !== null) $stack[] = [$node->left, $depth + 1];
        if ($node->right !== null) $stack[] = [$node->right, $depth + 1];
    }
    return $deepest;
}`,'An explicit stack replaces recursive calls, so deep trees do not exhaust the language call stack.')
},
{
id:'climbing-stairs',title:'Climbing Stairs',url:'https://leetcode.com/problems/climbing-stairs/',difficulty:'Easy',pattern:'Dynamic programming',summary:'Count the different sequences of one-step and two-step moves that reach step n.',example:{input:'n = 4',output:'5'},complexity:{time:'O(n)',space:'O(n)',plain:'Fill one saved result per stair. Only the previous two are needed for an optional constant-space version.'},analogy:'Fill a cache of completed subjobs. The answer for step 4 depends only on the cached answers for steps 3 and 2.',walkthrough:['There is one way to stay at step 0 and one way to reach step 1.','To reach step k, the previous move came from k-1 or k-2.','Add those two disjoint counts and store the answer for k.'],concepts:['memoization','control-flow'],solutions:answers(
`def climbStairs(n):
    ways = [0] * (n + 1)
    ways[0] = 1
    ways[1] = 1
    for step in range(2, n + 1):
        from_one_back = ways[step - 1]
        from_two_back = ways[step - 2]
        ways[step] = from_one_back + from_two_back
    return ways[n]`,
`function climbStairs(n) {
  const ways = new Array(n + 1).fill(0);
  ways[0] = 1;
  ways[1] = 1;
  for (let step = 2; step <= n; step++) {
    const fromOneBack = ways[step - 1];
    const fromTwoBack = ways[step - 2];
    ways[step] = fromOneBack + fromTwoBack;
  }
  return ways[n];
}`,
`package main
func climbStairs(n int) int {
    ways := make([]int, n+1)
    ways[0], ways[1] = 1, 1
    for step := 2; step <= n; step++ {
        fromOneBack := ways[step-1]
        fromTwoBack := ways[step-2]
        ways[step] = fromOneBack + fromTwoBack
    }
    return ways[n]
}`,
`<?php
function climbStairs($n) {
    $ways = array_fill(0, $n + 1, 0);
    $ways[0] = 1;
    $ways[1] = 1;
    for ($step = 2; $step <= $n; $step++) {
        $fromOneBack = $ways[$step - 1];
        $fromTwoBack = $ways[$step - 2];
        $ways[$step] = $fromOneBack + $fromTwoBack;
    }
    return $ways[$n];
}`,'This is bottom-up tabulation, not recursive memoization. It uses the same reuse principle with a visible, ordered table. The problem requires n >= 1.')
},
{
id:'longest-substring-without-repeating-characters',title:'Longest Substring Without Repeating Characters',url:'https://leetcode.com/problems/longest-substring-without-repeating-characters/',difficulty:'Medium',pattern:'Sliding window',summary:'Find the length of the longest contiguous span of characters containing no repeated character.',example:{input:'s = "abcaef"',output:'5, from "bcaef"'},complexity:{time:'O(n) average',space:'O(k)',plain:'The right edge advances once per character. Keep the last position of each of k distinct characters.'},analogy:'Keep a valid window of recent events. If an event key repeats, advance the window past its previous occurrence.',walkthrough:['Record the last position of each character.','If the current character appeared inside the window, move left past that position.','Update the best width and save the current character position. Never move left backward.'],concepts:['pointers','control-flow'],solutions:answers(
`def lengthOfLongestSubstring(s):
    last_seen = {}
    left = 0
    best = 0
    for right, char in enumerate(s):
        if char in last_seen and last_seen[char] >= left:
            left = last_seen[char] + 1
        width = right - left + 1
        if width > best: best = width
        last_seen[char] = right
    return best`,
`function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (lastSeen.has(char) && lastSeen.get(char) >= left) {
      left = lastSeen.get(char) + 1;
    }
    const width = right - left + 1;
    if (width > best) best = width;
    lastSeen.set(char, right);
  }
  return best;
}`,
`package main
func lengthOfLongestSubstring(s string) int {
    lastSeen := map[byte]int{}
    left, best := 0, 0
    for right := 0; right < len(s); right++ {
        char := s[right]
        previous, exists := lastSeen[char]
        if exists && previous >= left { left = previous+1 }
        width := right-left+1
        if width > best { best = width }
        lastSeen[char] = right
    }
    return best
}`,
`<?php
function lengthOfLongestSubstring($s) {
    $lastSeen = [];
    $left = 0;
    $best = 0;
    for ($right = 0; $right < strlen($s); $right++) {
        $char = $s[$right];
        if (isset($lastSeen[$char]) && $lastSeen[$char] >= $left) {
            $left = $lastSeen[$char] + 1;
        }
        $width = $right - $left + 1;
        if ($width > $best) $best = $width;
        $lastSeen[$char] = $right;
    }
    return $best;
}`,'The window includes both ends, so width is right minus left plus one. String indexing follows the problem ASCII-style alphabet; Unicode needs an explicit character policy.')
},
{
id:'group-anagrams',title:'Group Anagrams',url:'https://leetcode.com/problems/group-anagrams/',difficulty:'Medium',pattern:'Canonical keys',summary:'Group lowercase words whose letters can be rearranged into each other. Group order is irrelevant.',example:{input:'words = ["arc", "car", "dog", "god", "cat"]',output:'[["arc", "car"], ["dog", "god"], ["cat"]]'},complexity:{time:'O(n × k log k)',space:'O(n × k)',plain:'Sort up to k letters for each of n words, then group by that key.'},analogy:'Canonicalize an API request into a stable cache key before grouping equivalent requests.',walkthrough:['Sort each word into a canonical letter sequence.','Use that sequence as a dictionary key.','Append the original word to that key’s bucket, then return the buckets.'],concepts:['control-flow','complexity'],solutions:answers(
`def groupAnagrams(words):
    groups = {}
    for word in words:
        key = ''.join(sorted(word))
        if key not in groups: groups[key] = []
        groups[key].append(word)
    return list(groups.values())`,
`function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = word.split('').sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return Array.from(groups.values());
}`,
`package main
import "sort"
func groupAnagrams(words []string) [][]string {
    groups := map[string][]string{}
    for _, word := range words {
        letters := []byte(word)
        sort.Slice(letters, func(i, j int) bool { return letters[i] < letters[j] })
        key := string(letters)
        groups[key] = append(groups[key], word)
    }
    result := [][]string{}
    for _, group := range groups { result = append(result, group) }
    return result
}`,
`<?php
function groupAnagrams($words) {
    $groups = [];
    foreach ($words as $word) {
        $letters = str_split($word);
        sort($letters, SORT_STRING);
        $key = implode('', $letters);
        if (!isset($groups[$key])) $groups[$key] = [];
        $groups[$key][] = $word;
    }
    return array_values($groups);
}`,'The sorted letters are only the lookup key. Keep the original word in the result, including duplicate words.')
},
{
id:'product-of-array-except-self',title:'Product of Array Except Self',url:'https://leetcode.com/problems/product-of-array-except-self/',difficulty:'Medium',pattern:'Prefix and suffix passes',summary:'For each position, multiply every other value. Use linear time and no division, including inputs containing zeros.',example:{input:'nums = [2, 3, 4]',output:'[12, 8, 6]'},complexity:{time:'O(n)',space:'O(1) extra, excluding output',plain:'Two passes reuse the output array and one running product per direction.'},analogy:'Build each result from a summary of records before it and a summary of records after it.',walkthrough:['Write the product of values strictly before each position into the result.','Walk backward, keeping the product of values strictly after the position.','Multiply those two summaries. The current value is excluded from both.'],concepts:['control-flow','pointers'],solutions:answers(
`def productExceptSelf(nums):
    result = [1] * len(nums)
    before = 1
    for index in range(len(nums)):
        result[index] = before
        before *= nums[index]
    after = 1
    for index in range(len(nums) - 1, -1, -1):
        result[index] *= after
        after *= nums[index]
    return result`,
`function productExceptSelf(nums) {
  const result = new Array(nums.length).fill(1);
  let before = 1;
  for (let index = 0; index < nums.length; index++) {
    result[index] = before;
    before *= nums[index];
  }
  let after = 1;
  for (let index = nums.length - 1; index >= 0; index--) {
    result[index] *= after;
    after *= nums[index];
  }
  return result;
}`,
`package main
func productExceptSelf(nums []int) []int {
    result := make([]int, len(nums))
    before := 1
    for index := 0; index < len(nums); index++ {
        result[index] = before
        before *= nums[index]
    }
    after := 1
    for index := len(nums)-1; index >= 0; index-- {
        result[index] *= after
        after *= nums[index]
    }
    return result
}`,
`<?php
function productExceptSelf($nums) {
    $result = array_fill(0, count($nums), 1);
    $before = 1;
    for ($index = 0; $index < count($nums); $index++) {
        $result[$index] = $before;
        $before *= $nums[$index];
    }
    $after = 1;
    for ($index = count($nums) - 1; $index >= 0; $index--) {
        $result[$index] *= $after;
        $after *= $nums[$index];
    }
    return $result;
}`,'Update the result before multiplying the current value into the running product. Reversing those lines would include the value being excluded.')
},
{
id:'merge-intervals',title:'Merge Intervals',url:'https://leetcode.com/problems/merge-intervals/',difficulty:'Medium',pattern:'Sort and sweep',summary:'Combine overlapping closed ranges into the smallest set covering the same values. Touching endpoints count as overlap.',example:{input:'intervals = [[2, 5], [4, 8], [11, 13]]',output:'[[2, 8], [11, 13]]'},complexity:{time:'O(n log n)',space:'O(n)',plain:'Sorting dominates. Keep merged ranges plus the sorting copy or workspace.'},analogy:'Combine overlapping maintenance windows before publishing a customer-facing schedule.',walkthrough:['Sort ranges by start time.','Compare each range with the last merged range.','If they touch or overlap, extend the last end. Otherwise start a new range.'],concepts:['control-flow','complexity'],solutions:answers(
`def mergeIntervals(intervals):
    ordered = sorted(intervals, key=lambda interval: interval[0])
    merged = []
    for start, end in ordered:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            if end > merged[-1][1]: merged[-1][1] = end
    return merged`,
`function mergeIntervals(intervals) {
  const ordered = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ordered) {
    if (merged.length === 0 || start > merged[merged.length - 1][1]) {
      merged.push([start, end]);
    } else {
      const last = merged[merged.length - 1];
      if (end > last[1]) last[1] = end;
    }
  }
  return merged;
}`,
`package main
import "sort"
func mergeIntervals(intervals [][]int) [][]int {
    ordered := append([][]int{}, intervals...)
    sort.Slice(ordered, func(i, j int) bool { return ordered[i][0] < ordered[j][0] })
    merged := [][]int{}
    for _, interval := range ordered {
        start, end := interval[0], interval[1]
        if len(merged) == 0 || start > merged[len(merged)-1][1] {
            merged = append(merged, []int{start, end})
        } else {
            last := merged[len(merged)-1]
            if end > last[1] { last[1] = end }
        }
    }
    return merged
}`,
`<?php
function mergeIntervals($intervals) {
    usort($intervals, function ($a, $b) { return $a[0] <=> $b[0]; });
    $merged = [];
    foreach ($intervals as $interval) {
        [$start, $end] = $interval;
        $last = count($merged) - 1;
        if ($last < 0 || $start > $merged[$last][1]) {
            $merged[] = [$start, $end];
        } else {
            if ($end > $merged[$last][1]) $merged[$last][1] = $end;
        }
    }
    return $merged;
}`,'The sort callback compares start values. PHP <=> returns negative, zero, or positive for the sorter; it is not a ternary.')
},
{
id:'number-of-islands',title:'Number of Islands',url:'https://leetcode.com/problems/number-of-islands/',difficulty:'Medium',pattern:'Connected components',summary:'Count separate groups of land cells in a grid. Land connects vertically or horizontally, never diagonally.',example:{input:'grid = [["1","0","1"],["1","0","0"]]',output:'2'},complexity:{time:'O(rows × columns)',space:'O(rows × columns)',plain:'Each land cell is scheduled once; the pending-cell stack can grow with the grid.'},analogy:'Discover disconnected groups in an infrastructure map. Starting one traversal processes the entire reachable cluster.',walkthrough:['Scan for an unvisited land cell. It starts one new island.','Mark it visited immediately and add it to a stack.','Repeatedly visit neighboring land, marking before adding it. Return to the scan only after that island is exhausted.'],concepts:['control-flow','recursion'],solutions:answers(
`def numIslands(grid):
    if not grid: return 0
    rows, columns = len(grid), len(grid[0])
    count = 0
    for row in range(rows):
        for column in range(columns):
            if grid[row][column] != '1': continue
            count += 1
            grid[row][column] = '0'
            stack = [(row, column)]
            while stack:
                current_row, current_column = stack.pop()
                for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    next_row, next_column = current_row + dr, current_column + dc
                    if 0 <= next_row < rows and 0 <= next_column < columns:
                        if grid[next_row][next_column] == '1':
                            grid[next_row][next_column] = '0'
                            stack.append((next_row, next_column))
    return count`,
`function numIslands(grid) {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const columns = grid[0].length;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (grid[row][column] !== '1') continue;
      count++;
      grid[row][column] = '0';
      const stack = [[row, column]];
      while (stack.length > 0) {
        const [currentRow, currentColumn] = stack.pop();
        for (const [dr, dc] of directions) {
          const nextRow = currentRow + dr;
          const nextColumn = currentColumn + dc;
          if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns) {
            if (grid[nextRow][nextColumn] === '1') {
              grid[nextRow][nextColumn] = '0';
              stack.push([nextRow, nextColumn]);
            }
          }
        }
      }
    }
  }
  return count;
}`,
`package main
func numIslands(grid [][]byte) int {
    if len(grid) == 0 { return 0 }
    rows, columns, count := len(grid), len(grid[0]), 0
    directions := [][2]int{{1,0},{-1,0},{0,1},{0,-1}}
    for row := 0; row < rows; row++ {
        for column := 0; column < columns; column++ {
            if grid[row][column] != '1' { continue }
            count++
            grid[row][column] = '0'
            stack := [][2]int{{row,column}}
            for len(stack) > 0 {
                cell := stack[len(stack)-1]
                stack = stack[:len(stack)-1]
                for _, direction := range directions {
                    nextRow, nextColumn := cell[0]+direction[0], cell[1]+direction[1]
                    if nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns {
                        if grid[nextRow][nextColumn] == '1' {
                            grid[nextRow][nextColumn] = '0'
                            stack = append(stack, [2]int{nextRow,nextColumn})
                        }
                    }
                }
            }
        }
    }
    return count
}`,
`<?php
function numIslands(&$grid) {
    if (count($grid) === 0) return 0;
    $rows = count($grid); $columns = count($grid[0]); $count = 0;
    $directions = [[1,0],[-1,0],[0,1],[0,-1]];
    for ($row = 0; $row < $rows; $row++) {
        for ($column = 0; $column < $columns; $column++) {
            if ($grid[$row][$column] !== '1') continue;
            $count++;
            $grid[$row][$column] = '0';
            $stack = [[$row, $column]];
            while (count($stack) > 0) {
                [$currentRow, $currentColumn] = array_pop($stack);
                foreach ($directions as [$dr, $dc]) {
                    $nextRow = $currentRow + $dr; $nextColumn = $currentColumn + $dc;
                    if ($nextRow >= 0 && $nextRow < $rows && $nextColumn >= 0 && $nextColumn < $columns) {
                        if ($grid[$nextRow][$nextColumn] === '1') {
                            $grid[$nextRow][$nextColumn] = '0';
                            $stack[] = [$nextRow, $nextColumn];
                        }
                    }
                }
            }
        }
    }
    return $count;
}`,'These versions mutate visited land into water. Copy the grid first if callers need the original. Marking when scheduling prevents duplicate work.')
},
{
id:'binary-tree-level-order-traversal',title:'Binary Tree Level Order Traversal',url:'https://leetcode.com/problems/binary-tree-level-order-traversal/',difficulty:'Medium',pattern:'Breadth-first traversal',summary:'Return tree values grouped by depth, preserving left-to-right order within each depth.',example:{input:'root = [7, 3, 9, null, 5] (level order)',output:'[[7], [3, 9], [5]]'},complexity:{time:'O(n)',space:'O(n)',plain:'Visit every node once. The queue and returned levels together hold up to n values or nodes.'},analogy:'Process a job queue in batches. Children discovered by this batch belong to the next batch.',walkthrough:['The first batch contains only the root.','Read every node in the current batch and collect its children into a separate next batch.','Save the current values, replace the batch with its children, and repeat.'],concepts:['control-flow','recursion'],solutions:answers(
`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def levelOrder(root):
    if root is None: return []
    current_level = [root]
    result = []
    while current_level:
        values = []
        next_level = []
        for node in current_level:
            values.append(node.val)
            if node.left is not None: next_level.append(node.left)
            if node.right is not None: next_level.append(node.right)
        result.append(values)
        current_level = next_level
    return result`,
`class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val; this.left = left; this.right = right;
  }
}
function levelOrder(root) {
  if (root === null) return [];
  let currentLevel = [root];
  const result = [];
  while (currentLevel.length > 0) {
    const values = [];
    const nextLevel = [];
    for (const node of currentLevel) {
      values.push(node.val);
      if (node.left !== null) nextLevel.push(node.left);
      if (node.right !== null) nextLevel.push(node.right);
    }
    result.push(values);
    currentLevel = nextLevel;
  }
  return result;
}`,
`package main
type TreeNode struct { Val int; Left, Right *TreeNode }
func levelOrder(root *TreeNode) [][]int {
    result := [][]int{}
    if root == nil { return result }
    currentLevel := []*TreeNode{root}
    for len(currentLevel) > 0 {
        values := []int{}
        nextLevel := []*TreeNode{}
        for _, node := range currentLevel {
            values = append(values, node.Val)
            if node.Left != nil { nextLevel = append(nextLevel, node.Left) }
            if node.Right != nil { nextLevel = append(nextLevel, node.Right) }
        }
        result = append(result, values)
        currentLevel = nextLevel
    }
    return result
}`,
`<?php
class TreeNode {
    public $val; public $left; public $right;
    function __construct($val = 0, $left = null, $right = null) {
        $this->val = $val; $this->left = $left; $this->right = $right;
    }
}
function levelOrder($root) {
    if ($root === null) return [];
    $currentLevel = [$root];
    $result = [];
    while (count($currentLevel) > 0) {
        $values = []; $nextLevel = [];
        foreach ($currentLevel as $node) {
            $values[] = $node->val;
            if ($node->left !== null) $nextLevel[] = $node->left;
            if ($node->right !== null) $nextLevel[] = $node->right;
        }
        $result[] = $values;
        $currentLevel = $nextLevel;
    }
    return $result;
}`,'Separate current and next batches make level boundaries explicit. No recursion or repeated removal from the front of an array is needed.')
},
{
id:'coin-change',title:'Coin Change',url:'https://leetcode.com/problems/coin-change/',difficulty:'Medium',pattern:'Dynamic programming',summary:'With unlimited coins of the supplied positive denominations, find the fewest coins making the requested amount. Return -1 if impossible.',example:{input:'coins = [1, 3, 4], amount = 6',output:'2, using 3 + 3'},complexity:{time:'O(amount × denominations)',space:'O(amount)',plain:'For every smaller amount, try each coin and reuse the best saved result.'},analogy:'Build the cheapest plan for a job from already solved smaller jobs. The cache key is the remaining amount, and the value is the fewest coins.',walkthrough:['Save 0 coins for amount 0. Mark other amounts as not yet reachable.','For each amount, try every coin that fits and inspect the saved answer for amount minus coin.','Keep the smallest candidate count. A largest-coin-first strategy would choose 4+1+1 for 6, missing 3+3.'],concepts:['memoization','control-flow','complexity'],solutions:answers(
`def coinChange(coins, amount):
    unreachable = amount + 1
    best = [unreachable] * (amount + 1)
    best[0] = 0
    for subtotal in range(1, amount + 1):
        for coin in coins:
            if coin <= subtotal:
                candidate = best[subtotal - coin] + 1
                if candidate < best[subtotal]: best[subtotal] = candidate
    if best[amount] == unreachable: return -1
    return best[amount]`,
`function coinChange(coins, amount) {
  const unreachable = amount + 1;
  const best = new Array(amount + 1).fill(unreachable);
  best[0] = 0;
  for (let subtotal = 1; subtotal <= amount; subtotal++) {
    for (const coin of coins) {
      if (coin <= subtotal) {
        const candidate = best[subtotal - coin] + 1;
        if (candidate < best[subtotal]) best[subtotal] = candidate;
      }
    }
  }
  if (best[amount] === unreachable) return -1;
  return best[amount];
}`,
`package main
func coinChange(coins []int, amount int) int {
    unreachable := amount+1
    best := make([]int, amount+1)
    for subtotal := 1; subtotal <= amount; subtotal++ { best[subtotal] = unreachable }
    for subtotal := 1; subtotal <= amount; subtotal++ {
        for _, coin := range coins {
            if coin <= subtotal {
                candidate := best[subtotal-coin]+1
                if candidate < best[subtotal] { best[subtotal] = candidate }
            }
        }
    }
    if best[amount] == unreachable { return -1 }
    return best[amount]
}`,
`<?php
function coinChange($coins, $amount) {
    $unreachable = $amount + 1;
    $best = array_fill(0, $amount + 1, $unreachable);
    $best[0] = 0;
    for ($subtotal = 1; $subtotal <= $amount; $subtotal++) {
        foreach ($coins as $coin) {
            if ($coin <= $subtotal) {
                $candidate = $best[$subtotal - $coin] + 1;
                if ($candidate < $best[$subtotal]) $best[$subtotal] = $candidate;
            }
        }
    }
    if ($best[$amount] === $unreachable) return -1;
    return $best[$amount];
}`,'amount + 1 is a safe impossible count because positive integer coins cannot require more than amount coins. The code fills a table instead of recursively recomputing totals.')
},
{
id:'lru-cache',title:'LRU Cache',url:'https://leetcode.com/problems/lru-cache/',difficulty:'Medium',pattern:'Hash lookup and recency order',summary:'Implement a fixed-capacity key/value cache. Reads and writes refresh recency; adding beyond capacity removes the least recently accessed key. A miss returns -1.',example:{input:'capacity 2; put(7,70); put(8,80); get(7); put(9,90); get(8)',output:'get(7) = 70; get(8) = -1'},complexity:{time:'O(1) average per operation',space:'O(capacity)',plain:'Use a hash lookup plus an ordered structure. JavaScript Map performance depends on the engine; Go shows explicit linked-list bookkeeping.'},analogy:'A bounded API response cache keeps recently useful entries and evicts the oldest untouched entry.',walkthrough:['Maintain key lookup and order from least recent to most recent.','On a hit or update, move that entry to the most-recent end.','After insertion, if capacity is exceeded, remove the least-recent entry from both lookup and ordering.'],concepts:['memoization','pointers','control-flow'],solutions:answers(
`from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.entries = OrderedDict()

    def get(self, key):
        if key not in self.entries: return -1
        self.entries.move_to_end(key)
        return self.entries[key]

    def put(self, key, value):
        self.entries[key] = value
        self.entries.move_to_end(key)
        if len(self.entries) > self.capacity:
            self.entries.popitem(last=False)`,
`class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.entries = new Map();
  }
  get(key) {
    if (!this.entries.has(key)) return -1;
    const value = this.entries.get(key);
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }
  put(key, value) {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
  }
}`,
`package main
import "container/list"
type CacheEntry struct { Key, Value int }
type LRUCache struct {
    capacity int
    entries map[int]*list.Element
    order *list.List
}
func Constructor(capacity int) LRUCache {
    return LRUCache{capacity: capacity, entries: map[int]*list.Element{}, order: list.New()}
}
func (cache *LRUCache) Get(key int) int {
    element, exists := cache.entries[key]
    if !exists { return -1 }
    cache.order.MoveToBack(element)
    return element.Value.(CacheEntry).Value
}
func (cache *LRUCache) Put(key int, value int) {
    element, exists := cache.entries[key]
    if exists {
        element.Value = CacheEntry{key, value}
        cache.order.MoveToBack(element)
    } else {
        cache.entries[key] = cache.order.PushBack(CacheEntry{key, value})
    }
    if len(cache.entries) > cache.capacity {
        oldest := cache.order.Front()
        delete(cache.entries, oldest.Value.(CacheEntry).Key)
        cache.order.Remove(oldest)
    }
}`,
`<?php
class LRUCache {
    private $capacity;
    private $entries = [];
    function __construct($capacity) { $this->capacity = $capacity; }
    function get($key) {
        if (!array_key_exists($key, $this->entries)) return -1;
        $value = $this->entries[$key];
        unset($this->entries[$key]);
        $this->entries[$key] = $value;
        return $value;
    }
    function put($key, $value) {
        unset($this->entries[$key]);
        $this->entries[$key] = $value;
        if (count($this->entries) > $this->capacity) {
            $oldestKey = array_key_first($this->entries);
            unset($this->entries[$oldestKey]);
        }
    }
}`,'Python OrderedDict, JavaScript Map, and PHP ordered arrays preserve insertion order; remove and reinsert to refresh it. Go uses a map to linked-list elements. If libraries are disallowed, explain the same hash-map plus doubly-linked-list design.')
},
...extraAlgorithmQuestions,
];
