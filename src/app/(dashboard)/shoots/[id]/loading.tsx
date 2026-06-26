export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-4 w-4 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-6 w-56 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-40 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
