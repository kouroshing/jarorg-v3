export default function RootLoading() {
  return (
    <div className="mx-auto w-full max-w-[1360px] animate-pulse px-4 py-8 sm:px-8">
      <div className="mb-8 h-12 rounded-2xl border border-gray-100 bg-gray-50" />

      <div className="mb-8 space-y-4 rounded-3xl border border-gray-100 bg-gray-50 p-6">
        <div className="h-5 w-40 rounded-full bg-gray-100" />
        <div className="h-4 w-3/4 rounded-full bg-gray-100" />
        <div className="h-56 rounded-2xl bg-gray-100 md:h-72" />
      </div>

      <div className="mb-4 h-6 w-44 rounded-full bg-gray-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4"
          >
            <div className="h-40 rounded-xl bg-gray-100" />
            <div className="h-4 w-2/3 rounded-full bg-gray-100" />
            <div className="h-3 w-full rounded-full bg-gray-100" />
            <div className="h-3 w-5/6 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
