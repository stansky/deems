import type { AlgorithmQuestion } from './algorithms';

function answers(python: string, javascript: string, go: string, php: string, note: string): AlgorithmQuestion['solutions'] {
  return {
    python: { code: python, explanation: [note, 'Read each indented block as one branch or loop body.'] },
    javascript: { code: javascript, explanation: [note, 'Braces show the control-flow blocks; names describe the state being updated.'] },
    go: { code: go, explanation: [note, 'The snippet includes its package and imports for a standalone practice file.'] },
    php: { code: php, explanation: [note, 'Dollar-prefixed variables hold state; arrays serve as lists or keyed lookups.'] },
  };
}

export const extraAlgorithmQuestions: AlgorithmQuestion[] = [
{
  id:'top-k-frequent-elements', title:'Top K Frequent Elements', url:'https://leetcode.com/problems/top-k-frequent-elements/', difficulty:'Medium', pattern:'Frequency buckets',
  summary:'Return the k values occurring most often in an integer array. The selected set is unique; its order does not matter.', example:{input:'nums = [7, 4, 7, 1, 4, 7], k = 2',output:'[7, 4]'},
  complexity:{time:'O(n) average',space:'O(n)',plain:'Count values, place them into frequency buckets, then scan buckets from largest to smallest.'},
  analogy:'Find the most common error codes in a log without sorting every log event.', walkthrough:['Count how often each value appears.','Bucket values by their counts, not by their numeric values.','Read the highest-count buckets first until k values have been selected.'], concepts:['control-flow','complexity'],
  solutions:answers(
`def topKFrequent(nums, k):
    counts = {}
    for value in nums:
        if value not in counts:
            counts[value] = 0
        counts[value] += 1
    buckets = [[] for _ in range(len(nums) + 1)]
    for value, count in counts.items():
        buckets[count].append(value)
    result = []
    for frequency in range(len(nums), 0, -1):
        for value in buckets[frequency]:
            result.append(value)
            if len(result) == k:
                return result
    return result`,
`function topKFrequent(nums, k) {
  const counts = new Map();
  for (const value of nums) {
    if (!counts.has(value)) counts.set(value, 0);
    counts.set(value, counts.get(value) + 1);
  }
  const buckets = Array.from({length: nums.length + 1}, () => []);
  for (const [value, count] of counts) buckets[count].push(value);
  const result = [];
  for (let frequency = nums.length; frequency > 0; frequency--) {
    for (const value of buckets[frequency]) {
      result.push(value);
      if (result.length === k) return result;
    }
  }
  return result;
}`,
`package main
func topKFrequent(nums []int, k int) []int {
    counts := map[int]int{}
    for _, value := range nums { counts[value]++ }
    buckets := make([][]int, len(nums)+1)
    for value, count := range counts { buckets[count] = append(buckets[count], value) }
    result := []int{}
    for frequency := len(nums); frequency > 0; frequency-- {
        for _, value := range buckets[frequency] {
            result = append(result, value)
            if len(result) == k { return result }
        }
    }
    return result
}`,
`<?php
function topKFrequent($nums, $k) {
    $counts = [];
    foreach ($nums as $value) {
        if (!isset($counts[$value])) $counts[$value] = 0;
        $counts[$value]++;
    }
    $buckets = array_fill(0, count($nums) + 1, []);
    foreach ($counts as $value => $count) $buckets[$count][] = $value;
    $result = [];
    for ($frequency = count($nums); $frequency > 0; $frequency--) {
        foreach ($buckets[$frequency] as $value) {
            $result[] = $value;
            if (count($result) === $k) return $result;
        }
    }
    return $result;
}`,'A frequency cannot exceed the input length, so buckets need only n + 1 positions. No comparison sort is needed.')
},
{
  id:'kth-largest-element-in-an-array', title:'Kth Largest Element in an Array', url:'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty:'Medium', pattern:'Counting selection',
  summary:'Find the value at rank k when values are ordered from largest downward. Repeated values occupy separate ranks.', example:{input:'nums = [8, 3, 8, 5, 1], k = 2',output:'8'},
  complexity:{time:'O(n + R)',space:'O(R)',plain:'R is the range from the minimum value to the maximum value, at most 20,001 under this problem’s constraints.'},
  analogy:'Use an inventory histogram: consume counts from the largest value downward until the requested rank is reached.', walkthrough:['Find the smallest and largest input values.','Count each value at index value minus smallest.','Walk counts backward, subtracting how many ranks each value occupies. Return where k is exhausted.'], concepts:['control-flow','complexity'],
  solutions:answers(
`def findKthLargest(nums, k):
    smallest = min(nums)
    largest = max(nums)
    counts = [0] * (largest - smallest + 1)
    for value in nums:
        counts[value - smallest] += 1
    for offset in range(len(counts) - 1, -1, -1):
        k -= counts[offset]
        if k <= 0:
            return smallest + offset`,
`function findKthLargest(nums, k) {
  let smallest = nums[0];
  let largest = nums[0];
  for (const value of nums) {
    if (value < smallest) smallest = value;
    if (value > largest) largest = value;
  }
  const counts = new Array(largest - smallest + 1).fill(0);
  for (const value of nums) counts[value - smallest]++;
  for (let offset = counts.length - 1; offset >= 0; offset--) {
    k -= counts[offset];
    if (k <= 0) return smallest + offset;
  }
}`,
`package main
func findKthLargest(nums []int, k int) int {
    smallest, largest := nums[0], nums[0]
    for _, value := range nums {
        if value < smallest { smallest = value }
        if value > largest { largest = value }
    }
    counts := make([]int, largest-smallest+1)
    for _, value := range nums { counts[value-smallest]++ }
    for offset := len(counts)-1; offset >= 0; offset-- {
        k -= counts[offset]
        if k <= 0 { return smallest+offset }
    }
    panic("k outside valid input range")
}`,
`<?php
function findKthLargest($nums, $k) {
    $smallest = min($nums);
    $largest = max($nums);
    $counts = array_fill(0, $largest - $smallest + 1, 0);
    foreach ($nums as $value) $counts[$value - $smallest]++;
    for ($offset = count($counts) - 1; $offset >= 0; $offset--) {
        $k -= $counts[$offset];
        if ($k <= 0) return $smallest + $offset;
    }
}`,'This uses the stated -10,000 to 10,000 integer bound. For an unbounded value range, discuss a size-k heap or quickselect instead of allocating a huge histogram.')
},
{
  id:'search-in-rotated-sorted-array', title:'Search in Rotated Sorted Array', url:'https://leetcode.com/problems/search-in-rotated-sorted-array/', difficulty:'Medium', pattern:'Binary search with a sorted half',
  summary:'Find a target in a distinct-value ascending array whose beginning may have been moved to the end. Return its current index or -1.', example:{input:'nums = [8, 11, 14, 2, 5], target = 2',output:'3'},
  complexity:{time:'O(log n)',space:'O(1)',plain:'One half is sorted at every step, so one comparison range can be discarded.'},
  analogy:'Search a rotated log buffer by identifying which half still has normal timestamp order.', walkthrough:['Check the middle value first.','Determine whether the left half is sorted. Check whether the target fits that half’s bounds.','Keep the half that can contain the target and exclude the inspected middle.'], concepts:['pointers','control-flow','complexity'],
  solutions:answers(
`def searchRotated(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        middle = left + (right - left) // 2
        if nums[middle] == target:
            return middle
        if nums[left] <= nums[middle]:
            if nums[left] <= target < nums[middle]:
                right = middle - 1
            else:
                left = middle + 1
        else:
            if nums[middle] < target <= nums[right]:
                left = middle + 1
            else:
                right = middle - 1
    return -1`,
`function searchRotated(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    if (nums[middle] === target) return middle;
    if (nums[left] <= nums[middle]) {
      if (nums[left] <= target && target < nums[middle]) right = middle - 1;
      else left = middle + 1;
    } else {
      if (nums[middle] < target && target <= nums[right]) left = middle + 1;
      else right = middle - 1;
    }
  }
  return -1;
}`,
`package main
func searchRotated(nums []int, target int) int {
    left, right := 0, len(nums)-1
    for left <= right {
        middle := left+(right-left)/2
        if nums[middle] == target { return middle }
        if nums[left] <= nums[middle] {
            if nums[left] <= target && target < nums[middle] { right = middle-1 } else { left = middle+1 }
        } else {
            if nums[middle] < target && target <= nums[right] { left = middle+1 } else { right = middle-1 }
        }
    }
    return -1
}`,
`<?php
function searchRotated($nums, $target) {
    $left = 0; $right = count($nums) - 1;
    while ($left <= $right) {
        $middle = $left + intdiv($right - $left, 2);
        if ($nums[$middle] === $target) return $middle;
        if ($nums[$left] <= $nums[$middle]) {
            if ($nums[$left] <= $target && $target < $nums[$middle]) $right = $middle - 1;
            else $left = $middle + 1;
        } else {
            if ($nums[$middle] < $target && $target <= $nums[$right]) $left = $middle + 1;
            else $right = $middle - 1;
        }
    }
    return -1;
}`,'Distinct values make the sorted-half decision unambiguous. This is not the duplicate-containing variant of the problem.')
},
{
  id:'find-minimum-in-rotated-sorted-array', title:'Find Minimum in Rotated Sorted Array', url:'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', difficulty:'Medium', pattern:'Binary search for the rotation boundary',
  summary:'Return the smallest value in a rotated ascending array of distinct integers.', example:{input:'nums = [9, 12, 15, 3, 6]',output:'3'},
  complexity:{time:'O(log n)',space:'O(1)',plain:'Compare the middle with the right edge and keep the half containing the smallest value.'},
  analogy:'Find the wrap point in a circular sequence of increasing record IDs.', walkthrough:['The minimum always remains between left and right, inclusive.','If middle is greater than the right value, the wrap lies strictly after middle.','Otherwise middle may itself be the minimum, so keep it as the right edge.'], concepts:['pointers','control-flow'],
  solutions:answers(
`def findMin(nums):
    left, right = 0, len(nums) - 1
    while left < right:
        middle = left + (right - left) // 2
        if nums[middle] > nums[right]:
            left = middle + 1
        else:
            right = middle
    return nums[left]`,
`function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const middle = left + Math.floor((right - left) / 2);
    if (nums[middle] > nums[right]) left = middle + 1;
    else right = middle;
  }
  return nums[left];
}`,
`package main
func findMin(nums []int) int {
    left, right := 0, len(nums)-1
    for left < right {
        middle := left+(right-left)/2
        if nums[middle] > nums[right] { left = middle+1 } else { right = middle }
    }
    return nums[left]
}`,
`<?php
function findMin($nums) {
    $left = 0; $right = count($nums) - 1;
    while ($left < $right) {
        $middle = $left + intdiv($right - $left, 2);
        if ($nums[$middle] > $nums[$right]) $left = $middle + 1;
        else $right = $middle;
    }
    return $nums[$left];
}`,'right = middle is intentional: middle has not been ruled out. With left < right, this update still shrinks the range.')
},
{
  id:'maximum-subarray', title:'Maximum Subarray', url:'https://leetcode.com/problems/maximum-subarray/', difficulty:'Medium', pattern:'Best running segment',
  summary:'Find the largest sum of a nonempty contiguous slice of an integer array.', example:{input:'nums = [-4, 3, -1, 5, -8]',output:'7, from [3, -1, 5]'},
  complexity:{time:'O(n)',space:'O(1)',plain:'Carry only the best sum ending at the current position and the best sum seen overall.'},
  analogy:'Track the strongest continuous period of net gains. A negative prior balance only hurts a fresh period.', walkthrough:['Start both saved sums at the first value so all-negative inputs work.','For each next value, choose between extending the previous slice and starting here.','Save the best ending-here sum in the overall best when it improves.'], concepts:['control-flow','memoization'],
  solutions:answers(
`def maxSubArray(nums):
    ending_here = nums[0]
    best = nums[0]
    for index in range(1, len(nums)):
        value = nums[index]
        extended = ending_here + value
        if value > extended:
            ending_here = value
        else:
            ending_here = extended
        if ending_here > best:
            best = ending_here
    return best`,
`function maxSubArray(nums) {
  let endingHere = nums[0];
  let best = nums[0];
  for (let index = 1; index < nums.length; index++) {
    const value = nums[index];
    const extended = endingHere + value;
    if (value > extended) endingHere = value;
    else endingHere = extended;
    if (endingHere > best) best = endingHere;
  }
  return best;
}`,
`package main
func maxSubArray(nums []int) int {
    endingHere, best := nums[0], nums[0]
    for index := 1; index < len(nums); index++ {
        value := nums[index]
        extended := endingHere+value
        if value > extended { endingHere = value } else { endingHere = extended }
        if endingHere > best { best = endingHere }
    }
    return best
}`,
`<?php
function maxSubArray($nums) {
    $endingHere = $nums[0]; $best = $nums[0];
    for ($index = 1; $index < count($nums); $index++) {
        $value = $nums[$index];
        $extended = $endingHere + $value;
        if ($value > $extended) $endingHere = $value;
        else $endingHere = $extended;
        if ($endingHere > $best) $best = $endingHere;
    }
    return $best;
}`,'endingHere answers one precise subproblem: the best nonempty slice ending at this position. best may refer to an earlier slice.')
},
{
  id:'container-with-most-water', title:'Container With Most Water', url:'https://leetcode.com/problems/container-with-most-water/', difficulty:'Medium', pattern:'Two pointers',
  summary:'Choose two vertical walls to hold the greatest area of water. Capacity is their distance multiplied by the shorter wall height.', example:{input:'height = [2, 5, 3, 4]',output:'8, using positions 1 and 3'},
  complexity:{time:'O(n)',space:'O(1)',plain:'Each step moves one endpoint inward, so there are fewer than n comparisons.'},
  analogy:'A two-endpoint capacity calculation is limited by the weaker endpoint. Keeping that bottleneck while reducing width cannot improve the result.', walkthrough:['Start at the two farthest walls.','Measure width times the shorter height and update the best area.','Move the shorter wall inward, searching for a taller replacement.'], concepts:['pointers','control-flow','complexity'],
  solutions:answers(
`def maxArea(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        limiting_height = min(height[left], height[right])
        area = (right - left) * limiting_height
        if area > best:
            best = area
        if height[left] <= height[right]:
            left += 1
        else:
            right -= 1
    return best`,
`function maxArea(height) {
  let left = 0; let right = height.length - 1; let best = 0;
  while (left < right) {
    const limitingHeight = Math.min(height[left], height[right]);
    const area = (right - left) * limitingHeight;
    if (area > best) best = area;
    if (height[left] <= height[right]) left++;
    else right--;
  }
  return best;
}`,
`package main
func maxArea(height []int) int {
    left, right, best := 0, len(height)-1, 0
    for left < right {
        limitingHeight := height[left]
        if height[right] < limitingHeight { limitingHeight = height[right] }
        area := (right-left)*limitingHeight
        if area > best { best = area }
        if height[left] <= height[right] { left++ } else { right-- }
    }
    return best
}`,
`<?php
function maxArea($height) {
    $left = 0; $right = count($height) - 1; $best = 0;
    while ($left < $right) {
        $limitingHeight = min($height[$left], $height[$right]);
        $area = ($right - $left) * $limitingHeight;
        if ($area > $best) $best = $area;
        if ($height[$left] <= $height[$right]) $left++;
        else $right--;
    }
    return $best;
}`,'Moving the taller wall keeps the same limiting height or makes it worse, while width decreases. That is why the shorter wall can be safely discarded.')
},
{
  id:'3sum', title:'3Sum', url:'https://leetcode.com/problems/3sum/', difficulty:'Medium', pattern:'Sort plus two pointers',
  summary:'Return each distinct combination of three values summing to zero, using three different positions. Do not repeat equivalent triplets.', example:{input:'nums = [-3, 1, 2, -1, 0, 1]',output:'[[-3, 1, 2], [-1, 0, 1]]'},
  complexity:{time:'O(n²)',space:'O(n + output)',plain:'Sort a copy, then scan inward for each fixed first position. The answer itself can contain many triplets.'},
  analogy:'Fix one item in a reconciliation task, then use an ordered two-item search for the remainder.', walkthrough:['Sort the numbers so pointer movement has a predictable effect on the sum.','Fix one value and search the remaining suffix from both ends.','Move left for sums below zero and right for sums above zero. Skip repeated values after recording a match.'], concepts:['pointers','control-flow','complexity'],
  solutions:answers(
`def threeSum(nums):
    ordered = sorted(nums)
    result = []
    for first in range(len(ordered) - 2):
        if first > 0 and ordered[first] == ordered[first - 1]:
            continue
        left, right = first + 1, len(ordered) - 1
        while left < right:
            total = ordered[first] + ordered[left] + ordered[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([ordered[first], ordered[left], ordered[right]])
                left += 1
                right -= 1
                while left < right and ordered[left] == ordered[left - 1]:
                    left += 1
                while left < right and ordered[right] == ordered[right + 1]:
                    right -= 1
    return result`,
`function threeSum(nums) {
  const ordered = nums.slice().sort((a, b) => a - b);
  const result = [];
  for (let first = 0; first < ordered.length - 2; first++) {
    if (first > 0 && ordered[first] === ordered[first - 1]) continue;
    let left = first + 1; let right = ordered.length - 1;
    while (left < right) {
      const total = ordered[first] + ordered[left] + ordered[right];
      if (total < 0) left++;
      else if (total > 0) right--;
      else {
        result.push([ordered[first], ordered[left], ordered[right]]);
        left++; right--;
        while (left < right && ordered[left] === ordered[left - 1]) left++;
        while (left < right && ordered[right] === ordered[right + 1]) right--;
      }
    }
  }
  return result;
}`,
`package main
import "sort"
func threeSum(nums []int) [][]int {
    ordered := append([]int{}, nums...)
    sort.Ints(ordered)
    result := [][]int{}
    for first := 0; first < len(ordered)-2; first++ {
        if first > 0 && ordered[first] == ordered[first-1] { continue }
        left, right := first+1, len(ordered)-1
        for left < right {
            total := ordered[first]+ordered[left]+ordered[right]
            if total < 0 { left++ } else if total > 0 { right-- } else {
                result = append(result, []int{ordered[first],ordered[left],ordered[right]})
                left++; right--
                for left < right && ordered[left] == ordered[left-1] { left++ }
                for left < right && ordered[right] == ordered[right+1] { right-- }
            }
        }
    }
    return result
}`,
`<?php
function threeSum($nums) {
    sort($nums, SORT_NUMERIC);
    $result = [];
    for ($first = 0; $first < count($nums) - 2; $first++) {
        if ($first > 0 && $nums[$first] === $nums[$first - 1]) continue;
        $left = $first + 1; $right = count($nums) - 1;
        while ($left < $right) {
            $total = $nums[$first] + $nums[$left] + $nums[$right];
            if ($total < 0) $left++;
            elseif ($total > 0) $right--;
            else {
                $result[] = [$nums[$first], $nums[$left], $nums[$right]];
                $left++; $right--;
                while ($left < $right && $nums[$left] === $nums[$left - 1]) $left++;
                while ($left < $right && $nums[$right] === $nums[$right + 1]) $right--;
            }
        }
    }
    return $result;
}`,'These are value triplets, not original indices. Sorting a copy preserves the caller’s input order. Skipping duplicates prevents equivalent answers.')
},
{
  id:'longest-consecutive-sequence', title:'Longest Consecutive Sequence', url:'https://leetcode.com/problems/longest-consecutive-sequence/', difficulty:'Medium', pattern:'Set and sequence starts',
  summary:'Find the longest run of consecutive integer values in an unsorted array. Input positions need not be adjacent, and duplicates do not extend a run.', example:{input:'nums = [12, 5, 7, 6, 20, 5]',output:'3, for 5, 6, 7'},
  complexity:{time:'O(n) average',space:'O(n)',plain:'Only start counting where the previous integer is absent. Each distinct value belongs to one counted run.'},
  analogy:'Find uninterrupted ranges of received sequence numbers after deduplicating an event stream.', walkthrough:['Put distinct values into a lookup set.','Ignore a value when value minus one exists, because it is not a run’s start.','From each real start, count successive values and update the longest length.'], concepts:['control-flow','complexity'],
  solutions:answers(
`def longestConsecutive(nums):
    values = set(nums)
    best = 0
    for start in values:
        if start - 1 in values:
            continue
        current = start
        while current in values:
            current += 1
        length = current - start
        if length > best:
            best = length
    return best`,
`function longestConsecutive(nums) {
  const values = new Set(nums);
  let best = 0;
  for (const start of values) {
    if (values.has(start - 1)) continue;
    let current = start;
    while (values.has(current)) current++;
    const length = current - start;
    if (length > best) best = length;
  }
  return best;
}`,
`package main
func longestConsecutive(nums []int) int {
    values := map[int]bool{}
    for _, value := range nums { values[value] = true }
    best := 0
    for start := range values {
        if values[start-1] { continue }
        current := start
        for values[current] { current++ }
        length := current-start
        if length > best { best = length }
    }
    return best
}`,
`<?php
function longestConsecutive($nums) {
    $values = [];
    foreach ($nums as $value) $values[$value] = true;
    $best = 0;
    foreach ($values as $start => $present) {
        if (isset($values[$start - 1])) continue;
        $current = $start;
        while (isset($values[$current])) $current++;
        $length = $current - $start;
        if ($length > $best) $best = $length;
    }
    return $best;
}`,'Iterate distinct values, not the original duplicate-containing array. Otherwise repeated starts could cause the same long run to be scanned again.')
},
{
  id:'valid-sudoku', title:'Valid Sudoku', url:'https://leetcode.com/problems/valid-sudoku/', difficulty:'Medium', pattern:'Scoped uniqueness checks',
  summary:'Validate filled cells of a 9 by 9 board: no digit may repeat in a row, column, or 3 by 3 box. Empty cells are dots. This does not solve the puzzle.', example:{input:'An otherwise empty board has "4" at row 0 column 0 and row 0 column 5.',output:'false, because row 0 repeats 4'},
  complexity:{time:'O(1) for a fixed 9 × 9 board',space:'O(1) for a fixed 9 × 9 board',plain:'Inspect 81 cells and track at most three uniqueness keys per filled cell.'},
  analogy:'Apply three database uniqueness constraints to each record: one within its row, one within its column, and one within its box.', walkthrough:['Skip empty cells.','Build keys identifying this digit within its row, column, and box.','Reject any already-used key; otherwise save all three keys.'], concepts:['control-flow'],
  solutions:answers(
`def isValidSudoku(board):
    seen = set()
    for row in range(9):
        for column in range(9):
            value = board[row][column]
            if value == '.':
                continue
            box = (row // 3) * 3 + column // 3
            keys = [('row', row, value), ('column', column, value), ('box', box, value)]
            for key in keys:
                if key in seen:
                    return False
                seen.add(key)
    return True`,
`function isValidSudoku(board) {
  const seen = new Set();
  for (let row = 0; row < 9; row++) {
    for (let column = 0; column < 9; column++) {
      const value = board[row][column];
      if (value === '.') continue;
      const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      const keys = ['row:' + row + ':' + value, 'column:' + column + ':' + value, 'box:' + box + ':' + value];
      for (const key of keys) {
        if (seen.has(key)) return false;
        seen.add(key);
      }
    }
  }
  return true;
}`,
`package main
import "fmt"
func isValidSudoku(board [][]byte) bool {
    seen := map[string]bool{}
    for row := 0; row < 9; row++ {
        for column := 0; column < 9; column++ {
            value := board[row][column]
            if value == '.' { continue }
            box := (row/3)*3+column/3
            keys := []string{fmt.Sprintf("row:%d:%c",row,value),fmt.Sprintf("column:%d:%c",column,value),fmt.Sprintf("box:%d:%c",box,value)}
            for _, key := range keys {
                if seen[key] { return false }
                seen[key] = true
            }
        }
    }
    return true
}`,
`<?php
function isValidSudoku($board) {
    $seen = [];
    for ($row = 0; $row < 9; $row++) {
        for ($column = 0; $column < 9; $column++) {
            $value = $board[$row][$column];
            if ($value === '.') continue;
            $box = intdiv($row, 3) * 3 + intdiv($column, 3);
            $keys = ['row:'.$row.':'.$value, 'column:'.$column.':'.$value, 'box:'.$box.':'.$value];
            foreach ($keys as $key) {
                if (isset($seen[$key])) return false;
                $seen[$key] = true;
            }
        }
    }
    return true;
}`,'The box calculation first finds the group of three rows and columns. A currently valid partial board is not necessarily solvable.')
},
{
  id:'evaluate-reverse-polish-notation', title:'Evaluate Reverse Polish Notation', url:'https://leetcode.com/problems/evaluate-reverse-polish-notation/', difficulty:'Medium', pattern:'Stack-based evaluation',
  summary:'Evaluate a valid postfix expression containing integer tokens and +, -, *, /. Division discards the fractional part toward zero.', example:{input:'tokens = ["8", "3", "-", "2", "*"]',output:'10'},
  complexity:{time:'O(n)',space:'O(n)',plain:'Each token causes one push or one calculation using the two most recent operands.'},
  analogy:'A tiny instruction interpreter keeps intermediate results on a stack until an operator consumes them.', walkthrough:['Push number tokens as integers.','For an operator, pop the right operand first, then the left operand.','Calculate left operator right and push the result. The final stack value is the answer.'], concepts:['control-flow'],
  solutions:answers(
`def evalRPN(tokens):
    stack = []
    for token in tokens:
        if token not in ['+', '-', '*', '/']:
            stack.append(int(token))
            continue
        right = stack.pop()
        left = stack.pop()
        if token == '+':
            result = left + right
        elif token == '-':
            result = left - right
        elif token == '*':
            result = left * right
        else:
            result = abs(left) // abs(right)
            if (left < 0) != (right < 0):
                result = -result
        stack.append(result)
    return stack[0]`,
`function evalRPN(tokens) {
  const stack = [];
  for (const token of tokens) {
    if (!['+', '-', '*', '/'].includes(token)) {
      stack.push(Number(token));
      continue;
    }
    const right = stack.pop();
    const left = stack.pop();
    let result;
    if (token === '+') result = left + right;
    else if (token === '-') result = left - right;
    else if (token === '*') result = left * right;
    else result = Math.trunc(left / right);
    stack.push(result);
  }
  return stack[0];
}`,
`package main
import "strconv"
func evalRPN(tokens []string) int {
    stack := []int{}
    for _, token := range tokens {
        if token != "+" && token != "-" && token != "*" && token != "/" {
            value, _ := strconv.Atoi(token)
            stack = append(stack, value)
            continue
        }
        right := stack[len(stack)-1]
        left := stack[len(stack)-2]
        stack = stack[:len(stack)-2]
        result := 0
        if token == "+" { result = left+right } else if token == "-" { result = left-right } else if token == "*" { result = left*right } else { result = left/right }
        stack = append(stack, result)
    }
    return stack[0]
}`,
`<?php
function evalRPN($tokens) {
    $stack = [];
    foreach ($tokens as $token) {
        if (!in_array($token, ['+', '-', '*', '/'], true)) {
            $stack[] = intval($token);
            continue;
        }
        $right = array_pop($stack);
        $left = array_pop($stack);
        if ($token === '+') $result = $left + $right;
        elseif ($token === '-') $result = $left - $right;
        elseif ($token === '*') $result = $left * $right;
        else $result = intdiv($left, $right);
        $stack[] = $result;
    }
    return $stack[0];
}`,'Operand order matters for subtraction and division. Python // rounds negative results downward, so the Python version divides absolute values and restores the sign explicitly.')
},
{
  id:'daily-temperatures', title:'Daily Temperatures', url:'https://leetcode.com/problems/daily-temperatures/', difficulty:'Medium', pattern:'Monotonic stack',
  summary:'For every day, report the wait until a strictly warmer future day. Use zero if no such day exists.', example:{input:'temperatures = [60, 58, 61, 61, 65]',output:'[2, 1, 2, 1, 0]'},
  complexity:{time:'O(n)',space:'O(n)',plain:'Each day is pushed once and removed at most once, despite the nested while loop.'},
  analogy:'Keep unresolved tickets whose condition is a future reading above their threshold. A new reading can resolve several pending tickets.', walkthrough:['Store indices of days still waiting for a warmer temperature.','While today is warmer than the last pending day, pop that day and record the index difference.','Push today as a new unresolved day. Remaining entries keep zero.'], concepts:['control-flow','complexity','pointers'],
  solutions:answers(
`def dailyTemperatures(temperatures):
    waits = [0] * len(temperatures)
    pending = []
    for day, temperature in enumerate(temperatures):
        while pending and temperature > temperatures[pending[-1]]:
            earlier = pending.pop()
            waits[earlier] = day - earlier
        pending.append(day)
    return waits`,
`function dailyTemperatures(temperatures) {
  const waits = new Array(temperatures.length).fill(0);
  const pending = [];
  for (let day = 0; day < temperatures.length; day++) {
    while (pending.length > 0 && temperatures[day] > temperatures[pending[pending.length - 1]]) {
      const earlier = pending.pop();
      waits[earlier] = day - earlier;
    }
    pending.push(day);
  }
  return waits;
}`,
`package main
func dailyTemperatures(temperatures []int) []int {
    waits := make([]int, len(temperatures))
    pending := []int{}
    for day, temperature := range temperatures {
        for len(pending) > 0 && temperature > temperatures[pending[len(pending)-1]] {
            earlier := pending[len(pending)-1]
            pending = pending[:len(pending)-1]
            waits[earlier] = day-earlier
        }
        pending = append(pending, day)
    }
    return waits
}`,
`<?php
function dailyTemperatures($temperatures) {
    $waits = array_fill(0, count($temperatures), 0);
    $pending = [];
    foreach ($temperatures as $day => $temperature) {
        while (count($pending) > 0 && $temperature > $temperatures[$pending[count($pending) - 1]]) {
            $earlier = array_pop($pending);
            $waits[$earlier] = $day - $earlier;
        }
        $pending[] = $day;
    }
    return $waits;
}`,'The stack stores indices so the answer can be a distance. Equal temperature does not resolve a day because the requested temperature must be strictly warmer.')
},
{
  id:'min-stack', title:'Min Stack', url:'https://leetcode.com/problems/min-stack/', difficulty:'Medium', pattern:'Stack with saved minimum',
  summary:'Build a stack supporting push, pop, top, and getMin in constant time. Read and pop calls are made only when the stack is nonempty.', example:{input:'push(6); push(2); push(4); getMin(); pop(); getMin()',output:'The two getMin calls both return 2.'},
  complexity:{time:'O(1) per operation',space:'O(n)',plain:'Each linked stack entry saves the smallest value at its depth. Pop restores the previous entry and its saved minimum.'},
  analogy:'Each state checkpoint stores both the new value and a small aggregate, so undo restores the earlier aggregate immediately.', walkthrough:['When pushing, compare the new value with the current minimum.','Store the value, that minimum, and a link to the old top together.','Pop follows the previous link. top and getMin read the current entry without scanning.'], concepts:['memoization','pointers','control-flow'],
  solutions:answers(
`class MinEntry:
    def __init__(self, value, minimum, previous):
        self.value = value
        self.minimum = minimum
        self.previous = previous

class MinStack:
    def __init__(self):
        self.head = None
    def push(self, value):
        minimum = value
        if self.head is not None and self.head.minimum < minimum:
            minimum = self.head.minimum
        self.head = MinEntry(value, minimum, self.head)
    def pop(self):
        self.head = self.head.previous
    def top(self):
        return self.head.value
    def getMin(self):
        return self.head.minimum`,
`class MinEntry {
  constructor(value, minimum, previous) {
    this.value = value; this.minimum = minimum; this.previous = previous;
  }
}
class MinStack {
  constructor() { this.head = null; }
  push(value) {
    let minimum = value;
    if (this.head !== null && this.head.minimum < minimum) minimum = this.head.minimum;
    this.head = new MinEntry(value, minimum, this.head);
  }
  pop() { this.head = this.head.previous; }
  top() { return this.head.value; }
  getMin() { return this.head.minimum; }
}`,
`package main
type MinEntry struct { value, minimum int; previous *MinEntry }
type MinStack struct { head *MinEntry }
func Constructor() MinStack { return MinStack{} }
func (stack *MinStack) Push(value int) {
    minimum := value
    if stack.head != nil && stack.head.minimum < minimum { minimum = stack.head.minimum }
    stack.head = &MinEntry{value, minimum, stack.head}
}
func (stack *MinStack) Pop() { stack.head = stack.head.previous }
func (stack *MinStack) Top() int { return stack.head.value }
func (stack *MinStack) GetMin() int { return stack.head.minimum }`,
`<?php
class MinEntry {
    public $value; public $minimum; public $previous;
    function __construct($value, $minimum, $previous) {
        $this->value = $value; $this->minimum = $minimum; $this->previous = $previous;
    }
}
class MinStack {
    private $head = null;
    function push($value) {
        $minimum = $value;
        if ($this->head !== null && $this->head->minimum < $minimum) $minimum = $this->head->minimum;
        $this->head = new MinEntry($value, $minimum, $this->head);
    }
    function pop() { $this->head = $this->head->previous; }
    function top() { return $this->head->value; }
    function getMin() { return $this->head->minimum; }
}`,'Saving a minimum on every entry handles duplicate minima automatically. Removing one copy of the minimum still leaves the correct earlier minimum.')
},
{
  id:'binary-tree-inorder-traversal', title:'Binary Tree Inorder Traversal', url:'https://leetcode.com/problems/binary-tree-inorder-traversal/', difficulty:'Easy', pattern:'Iterative tree traversal',
  summary:'List binary-tree values in left-subtree, current-node, right-subtree order. The tree does not need to be a search tree.', example:{input:'root = [8, 3, 10, null, 6] (level order)',output:'[3, 6, 8, 10]'},
  complexity:{time:'O(n)',space:'O(h) extra, excluding output',plain:'Each node is pushed and visited once. The stack tracks the current unfinished path of height h.'},
  analogy:'Pause a parent task while handling its left child, then resume it before moving to the right child.', walkthrough:['Follow left links, pushing each node as a reminder to return.','When no left node remains, pop and visit one reminder.','Switch to that node’s right child and repeat.'], concepts:['recursion','pointers','control-flow'],
  solutions:answers(
`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorderTraversal(root):
    result = []
    stack = []
    current = root
    while current is not None or stack:
        while current is not None:
            stack.append(current)
            current = current.left
        current = stack.pop()
        result.append(current.val)
        current = current.right
    return result`,
`class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function inorderTraversal(root) {
  const result = []; const stack = [];
  let current = root;
  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }
    current = stack.pop();
    result.push(current.val);
    current = current.right;
  }
  return result;
}`,
`package main
type TreeNode struct { Val int; Left, Right *TreeNode }
func inorderTraversal(root *TreeNode) []int {
    result := []int{}
    stack := []*TreeNode{}
    current := root
    for current != nil || len(stack) > 0 {
        for current != nil {
            stack = append(stack, current)
            current = current.Left
        }
        current = stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        result = append(result, current.Val)
        current = current.Right
    }
    return result
}`,
`<?php
class TreeNode {
    public $val; public $left; public $right;
    function __construct($val=0, $left=null, $right=null) { $this->val=$val; $this->left=$left; $this->right=$right; }
}
function inorderTraversal($root) {
    $result = []; $stack = []; $current = $root;
    while ($current !== null || count($stack) > 0) {
        while ($current !== null) {
            $stack[] = $current;
            $current = $current->left;
        }
        $current = array_pop($stack);
        $result[] = $current->val;
        $current = $current->right;
    }
    return $result;
}`,'The stack makes recursive return points visible. Inorder values are sorted only when the input also satisfies the binary-search-tree ordering rule.')
},
{
  id:'invert-binary-tree', title:'Invert Binary Tree', url:'https://leetcode.com/problems/invert-binary-tree/', difficulty:'Easy', pattern:'Tree traversal and local swap',
  summary:'Mirror a binary tree by swapping left and right children at every node. Return the root of the modified tree.', example:{input:'root = [8, 3, 10, 1, 6] (level order)',output:'[8, 10, 3, null, null, 6, 1]'},
  complexity:{time:'O(n)',space:'O(h)',plain:'Visit each node once. The explicit traversal stack holds pending branches along a path.'},
  analogy:'Apply the same small migration to every node in a nested object graph.', walkthrough:['If the tree is empty, return it immediately.','Pop a node and exchange its child references using a temporary variable.','Schedule both existing children and repeat until every node has been updated.'], concepts:['pointers','recursion','control-flow'],
  solutions:answers(
`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def invertTree(root):
    if root is None:
        return None
    stack = [root]
    while stack:
        node = stack.pop()
        old_left = node.left
        node.left = node.right
        node.right = old_left
        if node.left is not None:
            stack.append(node.left)
        if node.right is not None:
            stack.append(node.right)
    return root`,
`class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function invertTree(root) {
  if (root === null) return null;
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    const oldLeft = node.left;
    node.left = node.right;
    node.right = oldLeft;
    if (node.left !== null) stack.push(node.left);
    if (node.right !== null) stack.push(node.right);
  }
  return root;
}`,
`package main
type TreeNode struct { Val int; Left, Right *TreeNode }
func invertTree(root *TreeNode) *TreeNode {
    if root == nil { return nil }
    stack := []*TreeNode{root}
    for len(stack) > 0 {
        node := stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        oldLeft := node.Left
        node.Left = node.Right
        node.Right = oldLeft
        if node.Left != nil { stack = append(stack, node.Left) }
        if node.Right != nil { stack = append(stack, node.Right) }
    }
    return root
}`,
`<?php
class TreeNode {
    public $val; public $left; public $right;
    function __construct($val=0, $left=null, $right=null) { $this->val=$val; $this->left=$left; $this->right=$right; }
}
function invertTree($root) {
    if ($root === null) return null;
    $stack = [$root];
    while (count($stack) > 0) {
        $node = array_pop($stack);
        $oldLeft = $node->left;
        $node->left = $node->right;
        $node->right = $oldLeft;
        if ($node->left !== null) $stack[] = $node->left;
        if ($node->right !== null) $stack[] = $node->right;
    }
    return $root;
}`,'The original nodes are mutated, not copied. Saving oldLeft before the first assignment prevents losing that subtree.')
},
{
  id:'same-tree', title:'Same Tree', url:'https://leetcode.com/problems/same-tree/', difficulty:'Easy', pattern:'Paired tree traversal',
  summary:'Check whether two binary trees have matching structure and matching values at every corresponding position.', example:{input:'p = [5, 2, 9], q = [5, 2, 9] (level order)',output:'true'},
  complexity:{time:'O(n) for matching trees',space:'O(h)',plain:'Visit corresponding pairs together and stop at the first value or shape mismatch.'},
  analogy:'Compare two nested configuration objects while checking that keys exist at the same structural locations.', walkthrough:['Push the pair of roots.','Two empty references match; exactly one empty reference is a shape mismatch.','For two real nodes, compare values and schedule corresponding left and right pairs.'], concepts:['pointers','control-flow','recursion'],
  solutions:answers(
`class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def isSameTree(p, q):
    stack = [(p, q)]
    while stack:
        first, second = stack.pop()
        if first is None and second is None:
            continue
        if first is None or second is None:
            return False
        if first.val != second.val:
            return False
        stack.append((first.left, second.left))
        stack.append((first.right, second.right))
    return True`,
`class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function isSameTree(p, q) {
  const stack = [[p, q]];
  while (stack.length > 0) {
    const [first, second] = stack.pop();
    if (first === null && second === null) continue;
    if (first === null || second === null) return false;
    if (first.val !== second.val) return false;
    stack.push([first.left, second.left]);
    stack.push([first.right, second.right]);
  }
  return true;
}`,
`package main
type TreeNode struct { Val int; Left, Right *TreeNode }
func isSameTree(p *TreeNode, q *TreeNode) bool {
    stack := [][2]*TreeNode{{p,q}}
    for len(stack) > 0 {
        pair := stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        first, second := pair[0], pair[1]
        if first == nil && second == nil { continue }
        if first == nil || second == nil { return false }
        if first.Val != second.Val { return false }
        stack = append(stack, [2]*TreeNode{first.Left,second.Left}, [2]*TreeNode{first.Right,second.Right})
    }
    return true
}`,
`<?php
class TreeNode {
    public $val; public $left; public $right;
    function __construct($val=0, $left=null, $right=null) { $this->val=$val; $this->left=$left; $this->right=$right; }
}
function isSameTree($p, $q) {
    $stack = [[$p, $q]];
    while (count($stack) > 0) {
        [$first, $second] = array_pop($stack);
        if ($first === null && $second === null) continue;
        if ($first === null || $second === null) return false;
        if ($first->val !== $second->val) return false;
        $stack[] = [$first->left, $second->left];
        $stack[] = [$first->right, $second->right];
    }
    return true;
}`,'Equal traversal values alone do not establish equal shape. A missing left child and missing right child are different structures.')
},
{
  id:'linked-list-cycle', title:'Linked List Cycle', url:'https://leetcode.com/problems/linked-list-cycle/', difficulty:'Easy', pattern:'Fast and slow references',
  summary:'Determine whether following next links can revisit the same node. Repeated values alone do not establish a cycle.', example:{input:'4 -> 7 -> 9, with 9.next pointing back to the node containing 7',output:'true'},
  complexity:{time:'O(n)',space:'O(1)',plain:'Two references traverse the chain at different speeds. They meet in a cycle or the faster one reaches an end.'},
  analogy:'Two workers move around the same circular route at different speeds. If the route loops, the faster worker eventually catches the slower one.', walkthrough:['Start slow and fast at the head.','Move slow by one link and fast by two, checking the next link exists first.','If they name the same object, there is a cycle. Reaching an empty link means no cycle.'], concepts:['pointers','control-flow'],
  solutions:answers(
`class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def hasCycle(head):
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
`class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
function hasCycle(head) {
  let slow = head; let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
`package main
type ListNode struct { Val int; Next *ListNode }
func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast { return true }
    }
    return false
}`,
`<?php
class ListNode {
    public $val; public $next;
    function __construct($val=0, $next=null) { $this->val=$val; $this->next=$next; }
}
function hasCycle($head) {
    $slow = $head; $fast = $head;
    while ($fast !== null && $fast->next !== null) {
        $slow = $slow->next;
        $fast = $fast->next->next;
        if ($slow === $fast) return true;
    }
    return false;
}`,'Compare node identity, not node values. The first comparison occurs after moving, otherwise the shared starting node would falsely look like a cycle.')
},
{
  id:'middle-of-the-linked-list', title:'Middle of the Linked List', url:'https://leetcode.com/problems/middle-of-the-linked-list/', difficulty:'Easy', pattern:'Fast and slow references',
  summary:'Return the middle node of a nonempty linked chain. For an even node count, choose the second of the two middle nodes.', example:{input:'2 -> 4 -> 6 -> 8',output:'The node containing 6, followed by 8'},
  complexity:{time:'O(n)',space:'O(1)',plain:'A fast reference moves twice for each slow step, locating the middle without counting or storing nodes.'},
  analogy:'Advance one cursor at half the pace of another. When the fast cursor finishes the stream, the slower one is halfway through.', walkthrough:['Start both references at the head.','While two forward moves are possible for fast, move slow once and fast twice.','Return slow when fast reaches the end. The loop condition selects the second middle on even-length lists.'], concepts:['pointers','control-flow'],
  solutions:answers(
`class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def middleNode(head):
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow`,
`class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
function middleNode(head) {
  let slow = head; let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}`,
`package main
type ListNode struct { Val int; Next *ListNode }
func middleNode(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
    }
    return slow
}`,
`<?php
class ListNode {
    public $val; public $next;
    function __construct($val=0, $next=null) { $this->val=$val; $this->next=$next; }
}
function middleNode($head) {
    $slow = $head; $fast = $head;
    while ($fast !== null && $fast->next !== null) {
        $slow = $slow->next;
        $fast = $fast->next->next;
    }
    return $slow;
}`,'Return the node reference, not its value or an index. Its existing next links expose the remaining suffix.')
},
{
  id:'implement-queue-using-stacks', title:'Implement Queue using Stacks', url:'https://leetcode.com/problems/implement-queue-using-stacks/', difficulty:'Easy', pattern:'Two-stack queue',
  summary:'Implement first-in-first-out push, pop, peek, and empty using only stack operations. Pop and peek are called only when nonempty.', example:{input:'push(4); push(7); peek(); pop(); empty()',output:'peek = 4, pop = 4, empty = false'},
  complexity:{time:'O(1) amortized per operation',space:'O(n)',plain:'An individual transfer can cost O(n), but every item transfers from input to output only once.'},
  analogy:'Incoming work lands on one pile. Flip that pile into a second pile when needed so the oldest job is now on top.', walkthrough:['Push new values onto the incoming stack.','Before reading or removing, transfer incoming items only if outgoing is empty.','Read or pop the outgoing top. The queue is empty only when both stacks are empty.'], concepts:['control-flow','complexity'],
  solutions:answers(
`class MyQueue:
    def __init__(self):
        self.incoming = []
        self.outgoing = []
    def push(self, value):
        self.incoming.append(value)
    def transfer(self):
        if not self.outgoing:
            while self.incoming:
                self.outgoing.append(self.incoming.pop())
    def pop(self):
        self.transfer()
        return self.outgoing.pop()
    def peek(self):
        self.transfer()
        return self.outgoing[-1]
    def empty(self):
        return not self.incoming and not self.outgoing`,
`class MyQueue {
  constructor() { this.incoming = []; this.outgoing = []; }
  push(value) { this.incoming.push(value); }
  transfer() {
    if (this.outgoing.length === 0) {
      while (this.incoming.length > 0) this.outgoing.push(this.incoming.pop());
    }
  }
  pop() { this.transfer(); return this.outgoing.pop(); }
  peek() { this.transfer(); return this.outgoing[this.outgoing.length - 1]; }
  empty() { return this.incoming.length === 0 && this.outgoing.length === 0; }
}`,
`package main
type MyQueue struct { incoming, outgoing []int }
func Constructor() MyQueue { return MyQueue{} }
func (queue *MyQueue) Push(value int) { queue.incoming = append(queue.incoming, value) }
func (queue *MyQueue) transfer() {
    if len(queue.outgoing) == 0 {
        for len(queue.incoming) > 0 {
            last := len(queue.incoming)-1
            queue.outgoing = append(queue.outgoing, queue.incoming[last])
            queue.incoming = queue.incoming[:last]
        }
    }
}
func (queue *MyQueue) Pop() int {
    queue.transfer()
    last := len(queue.outgoing)-1
    value := queue.outgoing[last]
    queue.outgoing = queue.outgoing[:last]
    return value
}
func (queue *MyQueue) Peek() int { queue.transfer(); return queue.outgoing[len(queue.outgoing)-1] }
func (queue *MyQueue) Empty() bool { return len(queue.incoming) == 0 && len(queue.outgoing) == 0 }`,
`<?php
class MyQueue {
    private $incoming = []; private $outgoing = [];
    function push($value) { $this->incoming[] = $value; }
    private function transfer() {
        if (count($this->outgoing) === 0) {
            while (count($this->incoming) > 0) $this->outgoing[] = array_pop($this->incoming);
        }
    }
    function pop() { $this->transfer(); return array_pop($this->outgoing); }
    function peek() { $this->transfer(); return $this->outgoing[count($this->outgoing) - 1]; }
    function empty() { return count($this->incoming) === 0 && count($this->outgoing) === 0; }
}`,'Transferring while outgoing still has values would break ordering. Amortized means the total cost of many operations is linear, not that every call takes the same time.')
},
{
  id:'flood-fill', title:'Flood Fill', url:'https://leetcode.com/problems/flood-fill/', difficulty:'Easy', pattern:'Connected-region traversal',
  summary:'Starting at one pixel, recolor all side-connected pixels that share its original color. Return the modified image.', example:{input:'image = [[2, 2, 0], [2, 0, 2]], sr = 0, sc = 0, color = 5',output:'[[5, 5, 0], [5, 0, 2]]'},
  complexity:{time:'O(rows × columns)',space:'O(rows × columns)',plain:'Each connected pixel is scheduled at most once. The work stack can hold a region proportional to the image.'},
  analogy:'Propagate an update through directly connected records belonging to the same group, stopping at boundaries.', walkthrough:['Remember the starting color. If it already equals the new color, return immediately.','Recolor a pixel when scheduling it so it cannot be scheduled twice.','Process the four side neighbors when they stay in bounds and still have the original color.'], concepts:['control-flow','recursion'],
  solutions:answers(
`def floodFill(image, sr, sc, color):
    original = image[sr][sc]
    if original == color:
        return image
    rows, columns = len(image), len(image[0])
    stack = [(sr, sc)]
    image[sr][sc] = color
    while stack:
        row, column = stack.pop()
        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            next_row, next_column = row + dr, column + dc
            if 0 <= next_row < rows and 0 <= next_column < columns:
                if image[next_row][next_column] == original:
                    image[next_row][next_column] = color
                    stack.append((next_row, next_column))
    return image`,
`function floodFill(image, sr, sc, color) {
  const original = image[sr][sc];
  if (original === color) return image;
  const rows = image.length; const columns = image[0].length;
  const directions = [[1,0],[-1,0],[0,1],[0,-1]];
  const stack = [[sr, sc]];
  image[sr][sc] = color;
  while (stack.length > 0) {
    const [row, column] = stack.pop();
    for (const [dr, dc] of directions) {
      const nextRow = row + dr; const nextColumn = column + dc;
      if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns) {
        if (image[nextRow][nextColumn] === original) {
          image[nextRow][nextColumn] = color;
          stack.push([nextRow, nextColumn]);
        }
      }
    }
  }
  return image;
}`,
`package main
func floodFill(image [][]int, sr int, sc int, color int) [][]int {
    original := image[sr][sc]
    if original == color { return image }
    rows, columns := len(image), len(image[0])
    directions := [][2]int{{1,0},{-1,0},{0,1},{0,-1}}
    stack := [][2]int{{sr,sc}}
    image[sr][sc] = color
    for len(stack) > 0 {
        pixel := stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        for _, direction := range directions {
            nextRow, nextColumn := pixel[0]+direction[0], pixel[1]+direction[1]
            if nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns {
                if image[nextRow][nextColumn] == original {
                    image[nextRow][nextColumn] = color
                    stack = append(stack, [2]int{nextRow,nextColumn})
                }
            }
        }
    }
    return image
}`,
`<?php
function floodFill(&$image, $sr, $sc, $color) {
    $original = $image[$sr][$sc];
    if ($original === $color) return $image;
    $rows = count($image); $columns = count($image[0]);
    $directions = [[1,0],[-1,0],[0,1],[0,-1]];
    $stack = [[$sr,$sc]];
    $image[$sr][$sc] = $color;
    while (count($stack) > 0) {
        [$row, $column] = array_pop($stack);
        foreach ($directions as [$dr, $dc]) {
            $nextRow = $row + $dr; $nextColumn = $column + $dc;
            if ($nextRow >= 0 && $nextRow < $rows && $nextColumn >= 0 && $nextColumn < $columns) {
                if ($image[$nextRow][$nextColumn] === $original) {
                    $image[$nextRow][$nextColumn] = $color;
                    $stack[] = [$nextRow,$nextColumn];
                }
            }
        }
    }
    return $image;
}`,'These implementations change the input image. The same-color early return is necessary because recoloring would otherwise fail to mark a pixel as visited.')
},
{
  id:'course-schedule', title:'Course Schedule', url:'https://leetcode.com/problems/course-schedule/', difficulty:'Medium', pattern:'Topological processing',
  summary:'Given course dependencies [course, prerequisite], decide whether every course can be completed. Circular dependencies make completion impossible.', example:{input:'numCourses = 3, prerequisites = [[1, 0], [2, 1]]',output:'true: take 0, then 1, then 2'},
  complexity:{time:'O(courses + dependencies)',space:'O(courses + dependencies)',plain:'Process each course once and remove each dependency once.'},
  analogy:'Run a build pipeline: jobs become ready when all upstream jobs finish. A dependency cycle leaves some jobs permanently blocked.', walkthrough:['Count unfinished prerequisites for each course and record which courses each prerequisite unlocks.','Queue all courses whose count is zero.','Complete ready courses, reduce their dependents’ counts, and queue newly ready courses. All courses must finish.'], concepts:['control-flow','complexity'],
  solutions:answers(
`def canFinish(numCourses, prerequisites):
    dependents = [[] for _ in range(numCourses)]
    pending = [0] * numCourses
    for course, prerequisite in prerequisites:
        dependents[prerequisite].append(course)
        pending[course] += 1
    ready = []
    for course in range(numCourses):
        if pending[course] == 0:
            ready.append(course)
    head = 0
    while head < len(ready):
        completed = ready[head]
        head += 1
        for course in dependents[completed]:
            pending[course] -= 1
            if pending[course] == 0:
                ready.append(course)
    return head == numCourses`,
`function canFinish(numCourses, prerequisites) {
  const dependents = Array.from({length: numCourses}, () => []);
  const pending = new Array(numCourses).fill(0);
  for (const [course, prerequisite] of prerequisites) {
    dependents[prerequisite].push(course);
    pending[course]++;
  }
  const ready = [];
  for (let course = 0; course < numCourses; course++) {
    if (pending[course] === 0) ready.push(course);
  }
  let head = 0;
  while (head < ready.length) {
    const completed = ready[head];
    head++;
    for (const course of dependents[completed]) {
      pending[course]--;
      if (pending[course] === 0) ready.push(course);
    }
  }
  return head === numCourses;
}`,
`package main
func canFinish(numCourses int, prerequisites [][]int) bool {
    dependents := make([][]int, numCourses)
    pending := make([]int, numCourses)
    for _, edge := range prerequisites {
        course, prerequisite := edge[0], edge[1]
        dependents[prerequisite] = append(dependents[prerequisite], course)
        pending[course]++
    }
    ready := []int{}
    for course := 0; course < numCourses; course++ {
        if pending[course] == 0 { ready = append(ready, course) }
    }
    head := 0
    for head < len(ready) {
        completed := ready[head]
        head++
        for _, course := range dependents[completed] {
            pending[course]--
            if pending[course] == 0 { ready = append(ready, course) }
        }
    }
    return head == numCourses
}`,
`<?php
function canFinish($numCourses, $prerequisites) {
    $dependents = array_fill(0, $numCourses, []);
    $pending = array_fill(0, $numCourses, 0);
    foreach ($prerequisites as [$course, $prerequisite]) {
        $dependents[$prerequisite][] = $course;
        $pending[$course]++;
    }
    $ready = [];
    for ($course = 0; $course < $numCourses; $course++) {
        if ($pending[$course] === 0) $ready[] = $course;
    }
    $head = 0;
    while ($head < count($ready)) {
        $completed = $ready[$head];
        $head++;
        foreach ($dependents[$completed] as $course) {
            $pending[$course]--;
            if ($pending[$course] === 0) $ready[] = $course;
        }
    }
    return $head === $numCourses;
}`,'The queue uses a moving head index instead of repeatedly removing its first array element. Isolated courses start ready and still count toward completion.')
},
];
