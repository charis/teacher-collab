
// Library imports
import Image from "next/image";
//import Topbar from "@/components/topbar/Topbar";

/**
 * @returns the UI to display while the page is loading.
 */
const loading = () => {
    return (
      <main className="bg-dark-layer-2 min-h-screen h-full flex flex-col">
        <div className="flex items-center justify-center h-[calc(100vh-5rem)] pointer-events-none select-none">
          <Image src    = "/images/loading.png"
                 alt    = "Loading image"
                 height = {600}
                 width  = {900}
                 priority // This tells Next.js to preload it
          />
        </div>
      </main>
    );
}
export default loading;