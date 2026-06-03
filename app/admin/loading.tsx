export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-28 rounded-full bg-gray-100" />
        <div className="h-8 w-56 rounded-full bg-gray-100" />
        <div className="h-4 w-72 rounded-full bg-gray-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4"
          >
            <div className="h-5 w-1/3 rounded-full bg-gray-100" />
            <div className="h-4 w-2/3 rounded-full bg-gray-100" />
            <div className="h-20 rounded-xl bg-gray-100" />
            <div className="h-9 w-28 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
