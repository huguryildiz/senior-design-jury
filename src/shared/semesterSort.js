function toPosterDateMs(value) {
  if (!value) return -1;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : -1;
}

export function sortSemestersByPosterDateDesc(list = []) {
  return [...(list || [])].sort((a, b) => {
    const diff = toPosterDateMs(b?.poster_date) - toPosterDateMs(a?.poster_date);
    if (diff !== 0) return diff;
    return String(a?.name || "").localeCompare(String(b?.name || ""), "tr");
  });
}
