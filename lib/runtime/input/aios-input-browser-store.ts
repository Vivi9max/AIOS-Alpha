“use client”;

const fileStore = new Map<
string,
File

();

export function registerAIOSInputFile(
inputId: string,
file: File,
): void {
if (
typeof inputId !== “string” ||
!inputId.trim()
) {
return;
}

fileStore.set(
inputId,
file,
);
}

export function getAIOSInputFile(
inputId: string,
): File | null {
if (
typeof inputId !== “string” ||
!inputId.trim()
) {
return null;
}

return (
fileStore.get(inputId) ??
null
);
}

export function removeAIOSInputFile(
inputId: string,
): void {
if (
typeof inputId !== “string” ||
!inputId.trim()
) {
return;
}

fileStore.delete(
inputId,
);
}

export function clearAIOSInputFiles(
inputIds: string[],
): void {
for (const inputId of inputIds) {
removeAIOSInputFile(
inputId,
);
}
}

export function getAIOSInputFiles(
inputIds: string[],
): Array<{
inputId: string;
file: File;
}> {
const result: Array<{
inputId: string;
file: File;
}> = [];

for (const inputId of inputIds) {
const file =
getAIOSInputFile(
inputId,
);

if (!file) {
  continue;
}
result.push({
  inputId,
  file,
});

}

return result;
}

export function getAIOSInputFileCount(): number {
return fileStore.size;
}

export function clearAllAIOSInputFiles(): void {
fileStore.clear();
}
