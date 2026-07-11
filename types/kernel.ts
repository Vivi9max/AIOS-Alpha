export type AIOSInput = {
  intent: string;
};

export type AIOSState =
  | "Unknown"
  | "Explore"
  | "Validate"
  | "Execute"
  | "Optimize"
  | "Scale";

export type AIOSDecision = {
  title: string;
  action: string;
};

export type AIOSMemory = {
  time: string;
  intent: string;
  state: AIOSState;
  decision: string;
};

export type AIOSResult = {
  state: AIOSState;
  decision: AIOSDecision;
};
