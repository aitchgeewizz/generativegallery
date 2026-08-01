/**
 * Fisher-Yates shuffle. The `sort(() => Math.random() - 0.5)` idiom it
 * replaces is biased (comparison sorts assume a consistent comparator)
 * and quietly favours some orderings — noticeable when the same few
 * artworks keep leading a "random" wall.
 */
export const shuffle = <T,>(arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
