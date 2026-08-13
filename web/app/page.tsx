import { SearchPage } from '../features/search/SearchPage';

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="font-(family-name:--font-display) text-3xl text-(--color-ink)">Speed Milhas</h1>
        <p className="mt-1 text-sm text-(--color-muted)">Busca de passagens por milhas entre três fornecedores.</p>
      </header>

      <SearchPage />
    </main>
  );
}
