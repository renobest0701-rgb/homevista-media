export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}
