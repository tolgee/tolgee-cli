export function appendBranch(branch?: string) {
  return branch ? ` (branch "${branch}")` : ' (no or default branch)';
}
