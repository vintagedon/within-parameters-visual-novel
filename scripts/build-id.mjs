/** Return whether porcelain status contains tracked or runtime-untracked inputs. */
export function runtimeDirtyFromPorcelain(output) {
  const porcelain = output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  const tracked = porcelain.filter((line) => !line.startsWith('??'));
  const runtimeUntracked = porcelain.filter(
    (line) => /^\?\?\s+"?(src|data|assets|public)\//.test(line)
  );
  return tracked.length > 0 || runtimeUntracked.length > 0;
}
