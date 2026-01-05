/**
 * Game Scoring Calculations
 * 
 * Implements the ScoringCalculations interface using centralized constants.
 */

import type { ScoringCalculations } from "@/types/game-interfaces";
import type { ScoutingEntryBase } from "@/types/scouting-entry";
import { AUTO_POINTS, TELEOP_POINTS, ENDGAME_POINTS } from "./constants";

/**
 * Standard game data structure
 */
export interface GameData {
    auto: {
        startPosition: number | null;
        action1Count: number;
        action2Count: number;
        action3Count: number;
        action4Count: number;
        toggle1: boolean;
        toggle2: boolean;
    };
    teleop: {
        action1Count: number;
        action2Count: number;
        action3Count: number;
    };
    endgame: {
        option1: boolean;
        option2: boolean;
        option3: boolean;
        option4: boolean;
        option5: boolean;
        toggle1: boolean;
        toggle2: boolean;
    };
    [key: string]: unknown;
}

/**
 * Scouting entry type with game-specific data
 */
export interface ScoutingEntry extends ScoutingEntryBase {
    gameData: GameData;
}

export const scoringCalculations: ScoringCalculations<ScoutingEntry> = {
    calculateAutoPoints(entry) {
        const gameData = entry.gameData as GameData;
        return (
            (gameData?.auto?.action1Count || 0) * AUTO_POINTS.ACTION_1 +
            (gameData?.auto?.action2Count || 0) * AUTO_POINTS.ACTION_2 +
            (gameData?.auto?.action3Count || 0) * AUTO_POINTS.ACTION_3 +
            (gameData?.auto?.action4Count || 0) * AUTO_POINTS.ACTION_4
        );
    },

    calculateTeleopPoints(entry) {
        const gameData = entry.gameData as GameData;
        return (
            (gameData?.teleop?.action1Count || 0) * TELEOP_POINTS.ACTION_1 +
            (gameData?.teleop?.action2Count || 0) * TELEOP_POINTS.ACTION_2 +
            (gameData?.teleop?.action3Count || 0) * TELEOP_POINTS.ACTION_3
        );
    },

    calculateEndgamePoints(entry) {
        const gameData = entry.gameData as GameData;
        let points = 0;
        if (gameData?.endgame?.option1) points += ENDGAME_POINTS.OPTION_1;
        if (gameData?.endgame?.option2) points += ENDGAME_POINTS.OPTION_2;
        if (gameData?.endgame?.option3) points += ENDGAME_POINTS.OPTION_3;
        return points;
    },

    calculateTotalPoints(entry) {
        return (
            this.calculateAutoPoints(entry) +
            this.calculateTeleopPoints(entry) +
            this.calculateEndgamePoints(entry)
        );
    }
};

export default scoringCalculations;
