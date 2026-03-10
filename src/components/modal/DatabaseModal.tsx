// Library imports
import { IoClose } from 'react-icons/io5';
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "@/styles/react-tabs.css";
// Custom imports
import EscapeHandler from "@/app/hooks/useEscape";
import ImportExportTab from "@/components/modal/db/ImportExportTab";
import BrowseEditTab from "@/components/modal/db/BrowseEditTab";

/**
 * Props for {@link DatabaseModal}.
 */
type DatabaseModalProps = {
    /** Whether the modal is currently visible */
    isOpen : boolean;
    /** Callback invoked when the modal should close (backdrop click, ESC key,
     *  or close button) */
    onClose: () => void;
};

/**
 * Admin-only, nearly full-screen modal for managing the database.
 * Provides two tabs:
 *
 * - **Import / Export** — upload or download CSV files for each Prisma model
 * - **Browse & Edit** — view, create, update, and delete individual records
 *
 * Follows the same visual pattern as {@link SettingsModal} (gradient
 * background, close button, ESC key support, backdrop click to dismiss).
 * Renders {@code null} when {@link DatabaseModalProps.isOpen} is
 * {@code false}.
 */
const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose }) => {
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    
    EscapeHandler(() => {
        if (isOpen) {
            onClose();
        }
    });
    
    if (!isOpen) {
        return null;
    }
    
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40"
             onClick  ={onClose}
        />

        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center z-50"
             onClick  ={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg shadow relative w-[95vw] h-[90vh] mx-4
                          bg-gradient-to-b from-cardinal-red to-slate-900 p-6 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Database Management</h2>
              <button type     ="button"
                      className="bg-transparent rounded-lg text-sm p-1.5 inline-flex
                                 items-center hover:bg-gray-800 hover:text-white text-white"
                      onClick  ={onClose}
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>
            
            {/* Tabbed Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs selectedIndex={activeTabIndex}
                    onSelect     ={(i: number) => setActiveTabIndex(i)}
                    className    ="flex flex-col flex-1 min-h-0"
              >
                <TabList className="flex gap-1 mb-4 border-b border-slate-600
                                    overflow-x-auto bg-transparent p-0 shrink-0">
                  <Tab className="px-4 py-2 text-sm text-gray-300 cursor-pointer rounded-t
                                  hover:text-white hover:bg-slate-700 focus:outline-none
                                  border-b-2 border-transparent"
                       selectedClassName="!text-white !border-b-2 !border-blue-500
                                          !bg-slate-700"
                  >
                    Import / Export
                  </Tab>
                  <Tab className="px-4 py-2 text-sm text-gray-300 cursor-pointer rounded-t
                                  hover:text-white hover:bg-slate-700 focus:outline-none
                                  border-b-2 border-transparent"
                       selectedClassName="!text-white !border-b-2 !border-blue-500
                                          !bg-slate-700"
                  >
                    Browse & Edit
                  </Tab>
                </TabList>
                
                <TabPanel className="flex-1 min-h-0 overflow-auto">
                  <ImportExportTab />
                </TabPanel>
                
                <TabPanel className="flex-1 min-h-0 overflow-auto">
                  <BrowseEditTab />
                </TabPanel>
              </Tabs>
            </div>
          </div>
        </div>
      </>
    );
};

export default DatabaseModal;