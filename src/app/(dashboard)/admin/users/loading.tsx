export default function AdminLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="h-6 w-36 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="flex-1 p-8 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>
    </div>
  );
}
