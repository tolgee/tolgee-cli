// In-memory storage for ETag data
// In the future we can use filesystem to store it
const etagStorage = new Map<number, { etag: string }>();

export function getETag(projectId: number): string | undefined {
  const data = etagStorage.get(projectId);

  if (!data) {
    return undefined;
  }

  return data.etag;
}

export function setETag(projectId: number, etag: string): void {
  etagStorage.set(projectId, {
    etag,
  });
}
