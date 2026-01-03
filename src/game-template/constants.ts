/**
 * Game Point Values
 * 
 * Centralizing these values ensures consistency across the application
 * and makes it easy to update each season.
 */

export const AUTO_POINTS = {
    ACTION_1: 3,
    ACTION_2: 5,
    ACTION_3: 2,
    ACTION_4: 4,
} as const;

export const TELEOP_POINTS = {
    ACTION_1: 2,
    ACTION_2: 4,
    ACTION_3: 3,
} as const;

export const ENDGAME_POINTS = {
    OPTION_1: 10,
    OPTION_2: 5,
    OPTION_3: 2,
    TOGGLE_1: 0,
    TOGGLE_2: 0,
} as const;

export const PENALTY_POINTS = {
    FOUL: 2,
    TECH_FOUL: 5,
} as const;
