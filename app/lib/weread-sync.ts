type RefreshWeReadDataOptions<TNotebooks, TStats, TSelectedNotes> = {
  loadNotebooks: () => Promise<TNotebooks>;
  loadStats: () => Promise<TStats>;
  loadSelectedNotes: () => Promise<TSelectedNotes>;
};

export async function refreshWeReadData<TNotebooks, TStats, TSelectedNotes>({
  loadNotebooks,
  loadStats,
  loadSelectedNotes,
}: RefreshWeReadDataOptions<TNotebooks, TStats, TSelectedNotes>) {
  const [notebooks, stats, selectedNotes] = await Promise.allSettled([
    loadNotebooks(),
    loadStats(),
    loadSelectedNotes(),
  ]);

  if (notebooks.status === "rejected") {
    throw notebooks.reason;
  }

  return {
    notebooks: notebooks.value,
    stats,
    selectedNotes,
  };
}
