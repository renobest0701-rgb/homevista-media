export default function PublicationsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-gray-100 p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 p-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
