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

export interface ActionLog {
  timestamp: string;
  actionType: string;
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
