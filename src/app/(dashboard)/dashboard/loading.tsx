export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 space-y-2">
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-7 w-12 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-10 bg-gray-100 rounded-lg animate-pulse" style={{ animationDelay: `${j * 40}ms` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
