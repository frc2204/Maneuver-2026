import { StrategyConfig } from "@/core/types/strategy";
import { scoringCalculations } from "./scoring";


export const strategyConfig: StrategyConfig = {
    columns: [
        // Team Info (Standard)
        { key: "teamNumber", label: "Team", category: "Team Info", visible: true, numeric: false },
        { key: "eventName", label: "Event", category: "Team Info", visible: true, numeric: false },
        { key: "matchCount", label: "Matches", category: "Team Info", visible: true, numeric: true },

        // Generic Auto Actions
        { key: "auto.action1Count", label: "Auto Action 1", category: "Auto", visible: true, numeric: true },
        { key: "auto.action2Count", label: "Auto Action 2", category: "Auto", visible: true, numeric: true },
        { key: "auto.action3Count", label: "Auto Action 3", category: "Auto", visible: false, numeric: true },
        { key: "auto.action4Count", label: "Auto Action 4", category: "Auto", visible: false, numeric: true },
        { key: "auto.startPosition", label: "Start Position", category: "Auto", visible: false, numeric: true },

        // Generic Teleop Actions
        { key: "teleop.action1Count", label: "Teleop Action 1", category: "Teleop", visible: true, numeric: true },
        { key: "teleop.action2Count", label: "Teleop Action 2", category: "Teleop", visible: true, numeric: true },
        { key: "teleop.action3Count", label: "Teleop Action 3", category: "Teleop", visible: false, numeric: true },

        // Generic Endgame
        { key: "endgame.option1", label: "Endgame Option 1", category: "Endgame", visible: true, numeric: false, percentage: true },
        { key: "endgame.option2", label: "Endgame Option 2", category: "Endgame", visible: true, numeric: false, percentage: true },
        { key: "endgame.option3", label: "Endgame Option 3", category: "Endgame", visible: false, numeric: false, percentage: true },
        { key: "endgame.toggle1", label: "Endgame Toggle 1", category: "Endgame", visible: false, numeric: false, percentage: true },
        { key: "endgame.toggle2", label: "Endgame Toggle 2", category: "Endgame", visible: false, numeric: false, percentage: true },

        // Aggregates (Standard)
        { key: "totalPoints", label: "Total Points", category: "Aggregates", visible: true, numeric: true },
        { key: "autoPoints", label: "Auto Points", category: "Aggregates", visible: false, numeric: true },
        { key: "teleopPoints", label: "Teleop Points", category: "Aggregates", visible: false, numeric: true },
        { key: "endgamePoints", label: "Endgame Points", category: "Aggregates", visible: false, numeric: true },

        /* 
        // EXAMPLE: 2025 Reefscape Specific Columns
        { key: "autoCoralPlaceL4Count", label: "Auto L4", category: "Auto Coral", visible: true, numeric: true },
        { key: "teleopCoralPlaceL4Count", label: "Teleop L4", category: "Teleop Coral", visible: true, numeric: true },
        { key: "totalPieces", label: "Total Pieces", category: "Aggregates", visible: true, numeric: true },
        */
    ],
    presets: {
        essential: ["teamNumber", "matchCount", "totalPoints", "auto.action1Count", "teleop.action1Count", "endgame.option1"],
        auto: ["teamNumber", "matchCount", "autoPoints", "auto.action1Count", "auto.action2Count", "auto.action3Count"],
        teleop: ["teamNumber", "matchCount", "teleopPoints", "teleop.action1Count", "teleop.action2Count", "teleop.action3Count"],
        endgame: ["teamNumber", "matchCount", "endgamePoints", "endgame.option1", "endgame.option2", "endgame.toggle1"],
        basic: ["teamNumber", "eventName", "matchCount"]
    },
    aggregates: {
        // These use the generic scoringCalculations which are configured year-by-year
        totalPoints: (match) => scoringCalculations.calculateTotalPoints({ gameData: match } as any),
        autoPoints: (match) => scoringCalculations.calculateAutoPoints({ gameData: match } as any),
        teleopPoints: (match) => scoringCalculations.calculateTeleopPoints({ gameData: match } as any),
        endgamePoints: (match) => scoringCalculations.calculateEndgamePoints({ gameData: match } as any),

        /*
        // EXAMPLE: 2025 Reefscape Specific Aggregates
        totalPieces: (match) => {
            const AutoCoral = val(match.autoCoralPlaceL1Count) + val(match.autoCoralPlaceL2Count) + val(match.autoCoralPlaceL3Count) + val(match.autoCoralPlaceL4Count);
            const TeleopCoral = val(match.teleopCoralPlaceL1Count) + val(match.teleopCoralPlaceL2Count) + val(match.teleopCoralPlaceL3Count) + val(match.teleopCoralPlaceL4Count);
            const Algae = val(match.autoAlgaePlaceNetShot) + val(match.autoAlgaePlaceProcessor) + val(match.teleopAlgaePlaceNetShot) + val(match.teleopAlgaePlaceProcessor);
            return AutoCoral + TeleopCoral + Algae;
        },
        */
    }
}
