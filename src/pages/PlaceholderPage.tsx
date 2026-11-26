export function PlaceholderPage({ tela, titulo }: { tela: string; titulo: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-600">Tela {tela} — em desenvolvimento.</p>
    </div>
  );
}
