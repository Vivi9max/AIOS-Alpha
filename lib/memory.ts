export type MemoryRecord = {
  time: string;
  intent: string;
  state: string;
  decision: string;
};

const memories: MemoryRecord[] = [];

export function saveMemory(record: MemoryRecord) {
  memories.unshift(record);
}

export function getMemories() {
  return memories;
}
