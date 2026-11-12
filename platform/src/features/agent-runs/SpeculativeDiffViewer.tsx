import React from "react";

export interface DiffBranchSummary {
  branchId: string;
  astHash: string;
  compilePassed: boolean;
}

export function SpeculativeDiffViewer({ branches }: { branches: DiffBranchSummary[] }) {
  return (
    <div className="rounded-md border p-4 space-y-2">
      <h2 className="text-sm font-medium">Speculative AST Candidates ({branches.length})</h2>
      <p className="text-xs text-muted-foreground">
        Select a verified microVM branch to inspect its minimal AST patch.
      </p>
    </div>
  );
}
