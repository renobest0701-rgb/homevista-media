export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="aspect-video bg-gray-100 animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
              <div className="p-4 space-y-2">
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
