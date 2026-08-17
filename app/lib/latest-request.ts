export type LatestRequest = {
  isCurrent(): boolean;
};

export function createLatestRequestGate() {
  let latestRequestId = 0;

  return {
    begin(): LatestRequest {
      const requestId = ++latestRequestId;
      return {
        isCurrent: () => requestId === latestRequestId,
      };
    },
    invalidate() {
      latestRequestId += 1;
    },
  };
}
