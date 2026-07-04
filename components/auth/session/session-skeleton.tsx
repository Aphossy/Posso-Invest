export const SessionSkeleton = () => {
  return (
    <div className="space-y-3 rounded-lg border p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-1 h-5 w-5 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-3 w-40 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-3 w-32 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-3 w-36 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
