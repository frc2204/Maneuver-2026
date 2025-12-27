/**
 * Scout Gamification Utilities
 * 
 * Year-agnostic scout prediction system. This handles:
 * - Match winner predictions (red vs blue alliance)
 * - Streak tracking for consecutive correct predictions
 * - Stake/point awarding system
 * 
 * This is NOT game-specific - it only cares about which alliance wins,
 * not about game pieces, scoring elements, or field objectives.
 */

import { gameDB } from './database';

/**
 * Stake values for prediction activities
 * These are the point rewards for scout predictions
 */
export const STAKE_VALUES = {
  CORRECT_PREDICTION: 10,
  INCORRECT_PREDICTION: 0,
  PARTICIPATION_BONUS: 1,
  STREAK_BONUS_BASE: 2, // Base streak bonus (2 stakes for 2+ in a row)
} as const;

/**
 * Calculate streak bonus stakes based on streak length
 * Rewards scouts for consecutive correct predictions
 */
export const calculateStreakBonus = (streakLength: number): number => {
  if (streakLength < 2) return 0;
  return STAKE_VALUES.STREAK_BONUS_BASE * (streakLength - 1);
};

/**
 * Check if current match is sequential to last verified prediction
 * Used for streak calculation - streaks only count for consecutive matches
 */
const isMatchSequential = async (
  scoutName: string,
  eventName: string,
  currentMatchNumber: string
): Promise<boolean> => {
  // Get the most recent verified prediction for this scout in this event
  const lastPrediction = await gameDB.predictions
    .where('scoutName')
    .equals(scoutName)
    .and(prediction => prediction.eventName === eventName && prediction.verified)
    .reverse()
    .sortBy('timestamp');

  if (!lastPrediction || lastPrediction.length === 0) {
    return true; // No previous predictions, so this is sequential (first prediction)
  }

  const lastMatch = lastPrediction[0];
  if (!lastMatch) return true;

  const lastMatchNumber = parseInt(lastMatch.matchNumber);
  const currentMatch = parseInt(currentMatchNumber);
  
  // Check if current match is exactly one more than the last match
  // Allow for some flexibility (e.g., within 3 matches) to account for missed matches
  const gap = currentMatch - lastMatchNumber;
  
  return gap <= 3 && gap > 0; // Sequential if gap is 1, 2, or 3 matches
};

/**
 * Update scout with prediction result and handle streaks
 * This is the core function for awarding stakes after match verification
 * 
 * @param name Scout name
 * @param isCorrect Whether prediction was correct
 * @param basePoints Base points to award (usually STAKE_VALUES.CORRECT_PREDICTION)
 * @param eventName Event key
 * @param matchNumber Match number
 * @returns Number of stakes awarded (includes streak bonus)
 */
export const updateScoutWithPredictionResult = async (
  name: string,
  isCorrect: boolean,
  basePoints: number,
  eventName: string,
  matchNumber: string
): Promise<number> => {
  const scout = await gameDB.scouts.get(name);
  if (!scout) return 0;

  let pointsAwarded = 0;
  let newCurrentStreak = scout.currentStreak;
  let newLongestStreak = scout.longestStreak;

  // Check if this match is sequential to the last verified prediction
  const isSequential = await isMatchSequential(name, eventName, matchNumber);

  if (isCorrect) {
    // Award base points
    pointsAwarded = basePoints;
    
    // Handle streak
    if (isSequential) {
      newCurrentStreak += 1;
      
      // Award streak bonus
      const streakBonus = calculateStreakBonus(newCurrentStreak);
      pointsAwarded += streakBonus;
      
      // Update longest streak if needed
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }
    } else {
      // Non-sequential correct prediction starts a new streak
      newCurrentStreak = 1;
    }
  } else {
    // Incorrect prediction breaks the streak
    newCurrentStreak = 0;
  }

  // Update scout stats
  await gameDB.scouts.update(name, {
    stakes: scout.stakes + pointsAwarded,
    stakesFromPredictions: scout.stakesFromPredictions + pointsAwarded,
    correctPredictions: scout.correctPredictions + (isCorrect ? 1 : 0),
    totalPredictions: scout.totalPredictions + 1,
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastUpdated: Date.now()
  });

  return pointsAwarded;
};

/**
 * Calculate scout accuracy percentage
 */
export const calculateAccuracy = (scout: { totalPredictions: number; correctPredictions: number }): number => {
  if (scout.totalPredictions === 0) return 0;
  return Math.round((scout.correctPredictions / scout.totalPredictions) * 100);
};
