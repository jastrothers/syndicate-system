export interface RuleSection {
  title: string;
  content?: string;
  examples?: string[];
  subsections?: Record<string, RuleSection>;
  constraints?: Record<string, any>;
}

export interface Component {
  type: string;
  name: string;
  quantity: number;
  description?: string;
  attributes?: Record<string, any>;
}

export interface SessionStats {
  sessionId: string;
  rulebookName: string;
  rulebookVersion?: string;
  createdAt: string;
  lastUpdatedAt: string;
  stateKeys: string[];
  ledgerCount: number;
  ledgerByType: Record<string, number>;
}

export interface Rulebook {
  metadata: {
    title: string;
    version: string;
    lastUpdated: string;
    versionTag?: string;
    description?: string;
    thematicBrief?: string;
  };
  sections: Record<string, RuleSection>;
  components?: Component[];
}

export interface VersionInfo {
  versionTag: string;
  title: string;
  version: string;
  lastUpdated: string;
  description?: string;
}

/** Action types the server itself generates — used as ledger actionType values. */
export const ACTION_LOG_TYPES = [
  "draw_from_deck",
  "shuffle_deck",
  "update_game_state",
  "move_entity",
  "roll_dice",
  "record_action",
  "log_playtest_note",
  "reveal_cards",
  "create_deck_from_reference",
  "insert_into_deck",
] as const;

export type ActionLogType = typeof ACTION_LOG_TYPES[number];

/**
 * ACTION_LOG_TYPES enumerates the built-in action types the server generates,
 * serving as documentation and autocomplete hints. The union with `string`
 * is intentional: the `record_action` tool accepts arbitrary user-defined
 * actionType values from tool callers, so the field must accept any string.
 * ACTION_LOG_TYPES is not enforced at runtime — it is a reference constant.
 */
export interface ActionLog {
  timestamp: string;
  actionType: ActionLogType | string;
  actor: string;
  data: Record<string, any>;
}

export interface PlaytestSession {
  sessionId: string;
  rulebookName: string;
  rulebookVersion?: string;
  state: Record<string, any>;
  ledger: ActionLog[];
  createdAt: string;
  lastUpdatedAt: string;
}

export interface DesignStep {
  stepNumber: number;
  persona: string;
  output: string;
  summary: string;
  timestamp: string;
  trace?: {
    observation: string;
    data: any;
    mechanism: string;
    impact: string;
  };
}

export interface DesignSession {
  sessionId: string;
  gameName: string;
  theme: string;
  steps: DesignStep[];
  status: "active" | "completed" | "archived";
  createdAt: string;
  lastUpdatedAt: string;
  preferencesSummarized?: string;
}

export interface DesignerProfile {
  affinities: Record<string, number>; // Mechanism ID -> weight (-1.0 to 1.0)
  complexityTolerance: number; // 1-5 scale
  thematicPreferences: string[];
  lastUpdated: string;
}

export interface DecisionEntry {
  stepId: number;
  decision: "accept" | "reject" | "defer";
  rationale: string;
  impactedMechanisms: string[];
  timestamp: string;
}

export interface DecisionLog {
  gameName: string;
  sessionId: string;
  decisions: DecisionEntry[];
}
