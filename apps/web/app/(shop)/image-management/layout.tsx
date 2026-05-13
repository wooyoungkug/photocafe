export default function ImageManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-[1100px] mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
