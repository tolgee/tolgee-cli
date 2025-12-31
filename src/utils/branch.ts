export function appendBranch(branch?: string) {
  return branch ? ` (branch "${branch}")` : ' (none or default branch)';
}
