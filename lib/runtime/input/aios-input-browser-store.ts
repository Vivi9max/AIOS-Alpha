"use client";

interface AIOSInputPreviewRecord {
  inputId: string;
  file: File;
  createdAt: number;
}

const fileStore =
  new Map<string, File>();

const processingFileStore =
  new Map<string, File>();

const previewStore =
  new Map<string, AIOSInputPreviewRecord>();

const previewOrder: string[] = [];

export function registerAIOSInputFile(
  inputId: string,
  file: File,
): void {
  if (
    typeof inputId !== "string" ||
    !inputId.trim()
  ) {
    return;
  }

  fileStore.set(
    inputId,
    file,
  );

  if (
    !previewStore.has(inputId)
  ) {
    previewStore.set(
      inputId,
      {
        inputId,
        file,
        createdAt: Date.now(),
      },
    );

    previewOrder.push(
      inputId,
    );
  }
}

export function registerAIOSInputProcessingFile(
  inputId: string,
  file: File,
): void {
  if (
    typeof inputId !== "string" ||
    !inputId.trim()
  ) {
    return;
  }

  processingFileStore.set(
    inputId,
    file,
  );
}

export function getAIOSInputFile(
  inputId: string,
): File | null {
  if (
    typeof inputId !== "string" ||
    !inputId.trim()
  ) {
    return null;
  }

  return (
    fileStore.get(
      inputId,
    ) ?? null
  );
}

export function getAIOSInputProcessingFile(
  inputId: string,
): File | null {
  if (
    typeof inputId !== "string" ||
    !inputId.trim()
  ) {
    return null;
  }

  return (
    processingFileStore.get(
      inputId,
    ) ?? null
  );
}

export function removeAIOSInputFile(
  inputId: string,
): void {
  if (
    typeof inputId !== "string" ||
    !inputId.trim()
  ) {
    return;
  }

  fileStore.delete(
    inputId,
  );

  processingFileStore.delete(
    inputId,
  );

  previewStore.delete(
    inputId,
  );

  const index =
    previewOrder.indexOf(
      inputId,
    );

  if (index >= 0) {
    previewOrder.splice(
      index,
      1,
    );
  }
}

export function clearAIOSInputFiles(
  inputIds: string[],
): void {
  for (
    const inputId of inputIds
  ) {
    if (
      typeof inputId !==
        "string" ||
      !inputId.trim()
    ) {
      continue;
    }

    fileStore.delete(
      inputId,
    );

    processingFileStore.delete(
      inputId,
    );

    /*
     * Keep previewStore alive for the
     * current chat session.
     *
     * This is intentional:
     * the actual uploaded File is transient,
     * while the UI needs to continue rendering
     * the attachment after the request finishes.
     */
  }
}

export function getAIOSInputFiles(
  inputIds: string[],
): Array<{
  inputId: string;
  file: File;
}> {
  const result:
    Array<{
      inputId: string;
      file: File;
    }> = [];

  for (
    const inputId of inputIds
  ) {
    if (
      typeof inputId !==
        "string" ||
      !inputId.trim()
    ) {
      continue;
    }

    const processingFile =
      getAIOSInputProcessingFile(
        inputId,
      );

    const file =
      processingFile ??
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

export function getAIOSInputPreview(
  inputId: string,
): File | null {
  return (
    previewStore.get(
      inputId,
    )?.file ?? null
  );
}

export function getAIOSInputPreviewBatches(): Array<
  Array<{
    inputId: string;
    file: File;
    createdAt: number;
  }>
> {
  const records =
    previewOrder
      .map(
        (inputId) =>
          previewStore.get(
            inputId,
          ),
      )
      .filter(
        (
          record,
        ): record is AIOSInputPreviewRecord =>
          Boolean(record),
      );

  if (
    records.length === 0
  ) {
    return [];
  }

  const batches:
    Array<
      Array<AIOSInputPreviewRecord>
    > = [];

  let current:
    AIOSInputPreviewRecord[] =
    [];

  let previousTime:
    number | null =
    null;

  for (
    const record of records
  ) {
    const startsNewBatch =
      previousTime !== null &&
      record.createdAt -
        previousTime >
        120_000;

    if (
      startsNewBatch &&
      current.length > 0
    ) {
      batches.push(
        current,
      );

      current = [];
    }

    current.push(
      record,
    );

    previousTime =
      record.createdAt;
  }

  if (
    current.length > 0
  ) {
    batches.push(
      current,
    );
  }

  return batches.map(
    (batch) =>
      batch.map(
        (record) => ({
          inputId:
            record.inputId,
          file:
            record.file,
          createdAt:
            record.createdAt,
        }),
      ),
  );
}

export function getAIOSInputFileCount(): number {
  return fileStore.size;
}

export function clearAllAIOSInputFiles(): void {
  fileStore.clear();

  processingFileStore.clear();

  /*
   * Do not clear previewStore here.
   * It belongs to the current UI session.
   */
}
