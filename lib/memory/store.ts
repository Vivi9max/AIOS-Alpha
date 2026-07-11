export interface MemoryItem {
  id: number;
  text: string;
}

const memory: MemoryItem[] = [];

export function addMemory(text: string) {
  memory.push({
    id: Date.now(),
    text,
  });
}

export function getMemory() {
  return memory;
}

export function clearMemory() {
  memory.length = 0;
}