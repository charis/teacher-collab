// Useful link:
// https://flowbite.com/docs/components/skeleton/

/**
 * @returns a skeleton form to display while the page is loading
 */
const SkeletonForm = () => {
  return (
    <div className="border-4 rounded-l-md rounded-r-md border-gray-400 rounded
                    shadow animate-pulse md:p-8 dark:border-gray-900">
      <div className="h-5 rounded-full bg-gray-400 w-52 mt-8 mb-8"/>
      <div className="h-4 rounded-full bg-gray-400 w-32 mb-2"/>
      <div className="h-10 rounded-l-md rounded-r-md bg-gray-400 w-auto mb-8"/>
      <div className="h-4 rounded-full bg-gray-400 w-32 mb-2"/>
      <div className="h-10 rounded-l-md rounded-r-md bg-gray-400 w-auto mb-8"/>
      <div className="h-10 rounded-l-md rounded-r-md bg-gray-400 w-auto mb-8"/>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * @returns the UI to display while the page is loading.
 */
const loading = () => {
    return (
      <main className="bg-dark-layer-2 min-h-screen">
        <div className="max-w-[1200px] mx-auto sm:w-4/12 w-full animate-pulse
                        sm:pt-24">
          <SkeletonForm />
        </div>
      </main>
    );
}
export default loading;

