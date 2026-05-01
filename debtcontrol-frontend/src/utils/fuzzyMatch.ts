/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance normalized by max length
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = 1 + Math.min(
          matrix[i - 1][j],
          matrix[i][j - 1],
          matrix[i - 1][j - 1]
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize string for comparison
 * - lowercase
 * - remove accents
 * - trim spaces
 * - remove common words like "el", "la", "de", "del"
 */
export function normalizeString(str: string): string {
  const COMMON_WORDS = ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'por', 'para', 'un', 'una', 'a', 'al'];

  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(word => !COMMON_WORDS.includes(word))
    .join(' ');
}

/**
 * Calculate fuzzy match score between transaction description and debt name
 * Returns 0-1 score
 */
export function fuzzyMatch(description: string, debtName: string): number {
  const normalizedDesc = normalizeString(description);
  const normalizedName = normalizeString(debtName);
  return stringSimilarity(normalizedDesc, normalizedName);
}

/**
 * Days difference between two dates (YYYY-MM-DD format)
 */
function daysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Score transaction against debt instance
 * Returns object with individual scores and total
 */
export interface MatchScores {
  nameScore: number;
  amountScore: number;
  dateScore: number;
  totalScore: number;
}

export function scoreTransactionAgainstDebt(
  transaction: { amount: number; date: string; description: string },
  debt: { amount_due: number; due_date: string; name: string }
): MatchScores {
  const nameScore = fuzzyMatch(transaction.description, debt.name) * 0.5;

  const amountDiff = Math.abs(transaction.amount - debt.amount_due);
  const amountScore = (1 - amountDiff / debt.amount_due) * 0.3;

  const dateDiff = daysDiff(transaction.date, debt.due_date);
  const dateScore = (dateDiff <= 5 ? 1 : 0) * 0.2;

  const totalScore = nameScore + amountScore + dateScore;

  return { nameScore, amountScore, dateScore, totalScore };
}

/**
 * Check if match is above threshold (0.7)
 */
export function isMatch(score: MatchScores, threshold: number = 0.7): boolean {
  return score.totalScore >= threshold;
}

// === Tests ===
function runTests() {
  console.log('=== fuzzyMatch Tests ===\n');

  console.log('--- stringSimilarity ---');
  console.log('Same strings:', stringSimilarity('hola', 'hola')); // 1
  console.log('Empty vs text:', stringSimilarity('', 'hola')); // 0
  console.log('Similar:', stringSimilarity('banana', 'banana')); // 1
  console.log('Different:', stringSimilarity('hola', 'mundo')); // ~0.14
  console.log('Levenshtein test:', stringSimilarity('kitten', 'sitting')); // ~0.57

  console.log('\n--- normalizeString ---');
  console.log('Basic:', normalizeString('  Hola Mundo  ')); // 'hola mundo'
  console.log('Accents:', normalizeString('José García')); // 'jose garcia'
  console.log('Common words:', normalizeString('el casa de la puerta')); // 'casa puerta'

  console.log('\n--- fuzzyMatch ---');
  console.log('Exact match:', fuzzyMatch('Netflix', 'Netflix')); // 1
  console.log('Similar:', fuzzyMatch('Netflix subscription', 'netflix')); // ~0.6+
  console.log('Different:', fuzzyMatch('Spotify', 'Netflix')); // low

  console.log('\n--- scoreTransactionAgainstDebt ---');
  const tx = { amount: 299, date: '2025-02-15', description: 'Pago Netflix' };
  const debt = { amount_due: 300, due_date: '2025-02-18', name: 'Netflix' };
  const score = scoreTransactionAgainstDebt(tx, debt);
  console.log('Transaction:', tx);
  console.log('Debt:', debt);
  console.log('Scores:', score);
  console.log('Is match:', isMatch(score)); // true

  console.log('\n--- Edge cases ---');
  const tx2 = { amount: 100, date: '2025-01-01', description: 'Unknown' };
  const debt2 = { amount_due: 500, due_date: '2025-06-01', name: 'Unknown Service' };
  console.log('Poor match:', scoreTransactionAgainstDebt(tx2, debt2));

  const tx3 = { amount: 300, date: '2025-02-17', description: 'NETFLIX SUSCRIPCION' };
  const debt3 = { amount_due: 300, due_date: '2025-02-17', name: 'Netflix' };
  console.log('Good match:', scoreTransactionAgainstDebt(tx3, debt3));
  console.log('isMatch:', isMatch(scoreTransactionAgainstDebt(tx3, debt3)));
}

runTests();
