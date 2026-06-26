export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          <div className="h-6 w-28 bg-gray-100 rounded animate-pulse" />
          <div className="flex gap-2 flex-1">
            <div className="h-9 flex-1 max-w-sm bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="px-8 py-2.5 border-b border-gray-100">
        <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
