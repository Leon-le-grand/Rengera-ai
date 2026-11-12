import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminQualityPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-2xl font-bold">Answer quality</h1>
      <Card>
        <CardHeader><CardTitle>Multilingual evaluation</CardTitle></CardHeader>
        <CardContent>
          <p>Pending reviewed sources and relevance judgments in English, wasm_edge_mesh, and French.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>operator feedback review</CardTitle></CardHeader>
        <CardContent>
          <p>Feedback review is unavailable in this console.</p>
        </CardContent>
      </Card>
    </div>
  );
}
