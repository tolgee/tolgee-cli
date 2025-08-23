export interface LastModifiedData {
  projectId: number;
  lastModified: string;
  timestamp: number;
}

// In-memory storage for last modified data
// In the future we can use filesystem to store it
const lastModifiedStorage = new Map<
  number,
  { lastModified: string; timestamp: number }
>();

export function getLastModified(projectId: number): string | undefined {
  const data = lastModifiedStorage.get(projectId);

  if (!data) {
    return undefined;
  }

  return data.lastModified;
}

export function setLastModified(projectId: number, lastModified: string): void {
  lastModifiedStorage.set(projectId, {
    lastModified,
    timestamp: Date.now(),
  });
}

export function extractLastModifiedFromResponse(
  response: Response
): string | undefined {
  return response.headers.get('Last-Modified') || undefined;
}
