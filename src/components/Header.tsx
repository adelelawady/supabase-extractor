export function Header() {
  return (
    <div className="text-center mb-12 animate-fade-in">
      <h1 className="text-4xl font-bold text-primary mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Supabase Extractor
      </h1>
      <p className="text-gray-600 text-lg">
        Extract and export your Supabase database policies, functions, and triggers
      </p>
    </div>
  );
}