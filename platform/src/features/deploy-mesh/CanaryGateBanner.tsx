import React from "react";

export function CanaryGateBanner({ region, weight }: { region: string; weight: number }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
      Canary soak active in <strong>{region}</strong> at <strong>{weight}%</strong> traffic weight.
    </div>
  );
}
