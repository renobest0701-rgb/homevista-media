export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="flex-1 p-8 space-y-3">
        <div className="flex gap-3 mb-5">
          <div className="h-9 flex-1 max-w-sm bg-gray-100 rounded-lg animate-pulse" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            </div>
            <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
