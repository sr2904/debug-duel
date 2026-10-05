/**
 * The five hand-written seed puzzles. Each has exactly one intended bug family.
 * seed-puzzles.test.ts proves that every buggy version fails at least one test
 * and every reference fix passes all of them.
 */

import type { Puzzle } from './types'

export const seedPuzzles: Puzzle[] = [
  {
    id: 'find-max',
    title: 'Find the maximum',
    difficulty: 'easy',
    fnName: 'findMax',
    description:
      'findMax(numbers) returns the largest number in the array, or null if the array is empty.',
    buggyCode: `function findMax(numbers) {
  let max = 0;
  for (const n of numbers) {
    if (n > max) max = n;
  }
  return max;
}`,
    referenceFix: `function findMax(numbers) {
  if (numbers.length === 0) return null;
  let max = numbers[0];
  for (const n of numbers) {
    if (n > max) max = n;
  }
  return max;
}`,
    tests: [
      { name: 'positive numbers', args: [[3, 9, 2]], expected: 9 },
      { name: 'single element', args: [[7]], expected: 7 },
      { name: 'all negative numbers', args: [[-5, -2, -9]], expected: -2 },
      { name: 'empty array', args: [[]], expected: null },
      { name: 'zero and negatives', args: [[-1, 0, -3]], expected: 0 },
      { name: 'duplicates of the max', args: [[4, 8, 8, 1]], expected: 8 },
    ],
  },
  {
    id: 'is-palindrome',
    title: 'Palindrome check',
    difficulty: 'easy',
    fnName: 'isPalindrome',
    description:
      'isPalindrome(text) returns true if the text reads the same forwards and backwards, ignoring case and any character that is not a letter or a digit.',
    buggyCode: `function isPalindrome(text) {
  const clean = text.toLowerCase().replace(/[^a-z]/g, '');
  for (let i = 0; i < clean.length / 2; i++) {
    if (clean[i] !== clean[clean.length - 1 - i]) return false;
  }
  return true;
}`,
    referenceFix: `function isPalindrome(text) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let i = 0; i < clean.length / 2; i++) {
    if (clean[i] !== clean[clean.length - 1 - i]) return false;
  }
  return true;
}`,
    tests: [
      { name: 'simple palindrome', args: ['racecar'], expected: true },
      { name: 'not a palindrome', args: ['hello'], expected: false },
      { name: 'ignores case and punctuation', args: ['A man, a plan, a canal: Panama'], expected: true },
      { name: 'digit palindrome', args: ['12321'], expected: true },
      { name: 'digits that differ', args: ['123'], expected: false },
      { name: 'letters and digits mixed', args: ['a1b2'], expected: false },
      { name: 'empty string', args: [''], expected: true },
    ],
  },
  {
    id: 'chunk-array',
    title: 'Chunk an array',
    difficulty: 'medium',
    fnName: 'chunk',
    description:
      'chunk(items, size) splits the array into consecutive groups of `size` items. The last group may be shorter. Example: chunk([1,2,3,4,5], 2) returns [[1,2],[3,4],[5]].',
    buggyCode: `function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length - 1; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}`,
    referenceFix: `function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}`,
    tests: [
      { name: 'even split', args: [[1, 2, 3, 4], 2], expected: [[1, 2], [3, 4]] },
      { name: 'leftover item', args: [[1, 2, 3, 4, 5], 2], expected: [[1, 2], [3, 4], [5]] },
      { name: 'size larger than array', args: [[1, 2], 5], expected: [[1, 2]] },
      { name: 'single item', args: [[9], 3], expected: [[9]] },
      { name: 'empty array', args: [[], 2], expected: [] },
      { name: 'size of one', args: [[1, 2, 3], 1], expected: [[1], [2], [3]] },
    ],
  },
  {
    id: 'merge-sorted',
    title: 'Merge two sorted arrays',
    difficulty: 'medium',
    fnName: 'mergeSorted',
    description:
      'mergeSorted(a, b) takes two arrays that are already sorted ascending and returns one sorted array containing every element of both.',
    buggyCode: `function mergeSorted(a, b) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i]);
      i++;
    } else {
      result.push(b[j]);
      j++;
    }
  }
  return result;
}`,
    referenceFix: `function mergeSorted(a, b) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      result.push(a[i]);
      i++;
    } else {
      result.push(b[j]);
      j++;
    }
  }
  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);
  return result;
}`,
    tests: [
      { name: 'interleaved', args: [[1, 4, 7], [2, 3, 9]], expected: [1, 2, 3, 4, 7, 9] },
      { name: 'one side is longer', args: [[1, 2], [3, 4, 5, 6]], expected: [1, 2, 3, 4, 5, 6] },
      { name: 'first array empty', args: [[], [1, 2]], expected: [1, 2] },
      { name: 'second array empty', args: [[5, 6], []], expected: [5, 6] },
      { name: 'both empty', args: [[], []], expected: [] },
      { name: 'duplicates across arrays', args: [[1, 2, 2], [2, 3]], expected: [1, 2, 2, 2, 3] },
      { name: 'all of a before b', args: [[1, 2], [8, 9]], expected: [1, 2, 8, 9] },
    ],
  },
  {
    id: 'count-words',
    title: 'Word frequency',
    difficulty: 'hard',
    fnName: 'countWords',
    description:
      'countWords(text) returns an object mapping each word to how many times it appears. Words are separated by whitespace and compared case-insensitively (store them lowercase). Leading, trailing, or repeated whitespace must not create empty words.',
    buggyCode: `function countWords(text) {
  const counts = {};
  for (const word of text.split(' ')) {
    counts[word] = counts[word] ? counts[word] + 1 : 1;
  }
  return counts;
}`,
    referenceFix: `function countWords(text) {
  const counts = Object.create(null);
  for (const word of text.toLowerCase().split(/\\s+/)) {
    if (word === '') continue;
    counts[word] = (counts[word] || 0) + 1;
  }
  return counts;
}`,
    tests: [
      { name: 'counts repeats', args: ['a b a'], expected: { a: 2, b: 1 } },
      { name: 'ignores case', args: ['Go go GO'], expected: { go: 3 } },
      { name: 'repeated spaces', args: ['a  b'], expected: { a: 1, b: 1 } },
      { name: 'leading and trailing spaces', args: ['  hi there  '], expected: { hi: 1, there: 1 } },
      { name: 'tabs and newlines', args: ['x\ty\nx'], expected: { x: 2, y: 1 } },
      { name: 'empty string', args: [''], expected: {} },
      { name: 'a word named constructor', args: ['constructor constructor'], expected: { constructor: 2 } },
    ],
  },
]

export function getSeedPuzzle(id: string): Puzzle | undefined {
  return seedPuzzles.find((p) => p.id === id)
}

export function pickRandomPuzzle(): Puzzle {
  return seedPuzzles[Math.floor(Math.random() * seedPuzzles.length)]
}
