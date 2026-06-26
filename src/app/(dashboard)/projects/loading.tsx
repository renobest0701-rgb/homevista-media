export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="h-6 w-28 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="flex-1 p-8 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" style={{ animationDelay: `${i * 50 + 25}ms` }} />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
