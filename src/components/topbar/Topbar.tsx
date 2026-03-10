"use client";

// Library imports
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, Settings as SettingsIcon, Database } from 'lucide-react';
// Custom imports
import SettingsModal from "@/components/modal/SettingsModal";
import DatabaseModal from "@/components/modal/DatabaseModal";
import LogoutButton from "@/components/topbar/LogoutButton";
import { SpeechUtil } from "@/util/SpeechUtil";
import { DBUser, Settings } from "@/types";

type TopbarProps = {
    user                : DBUser | null;
    toggleSidebar       : () => void;
    settings            : Settings | null;
    setSettings         : React.Dispatch<React.SetStateAction<Settings | null>>;
    currProblemCompleted: boolean;
    allProblemsCompleted: boolean;
    nextProblem         : () => void;
    endSession          : () => Promise<void>;
};

/**
 * - If the user is is {@code null} it means that the user is not logged in.
 * - If the user is omitted (i.e., {@code undefined}) it means that the user is
 *   logged in and the user info is beeing retrieved.
 * - If currUser has any other value it means that the user is logged in and the
 *   user info is already retrieved.
 */
const Topbar:React.FC<TopbarProps> = ({ user,
                                        toggleSidebar,
                                        settings,
                                        setSettings,
                                        currProblemCompleted,
                                        allProblemsCompleted,
                                        nextProblem,
                                        endSession }) => {
    // ---------------------------   S T A T E   ---------------------------- //
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [dbModalOpen,  setDbModalOpen]  = useState(false);
    
    const hoverEffectClassName = `absolute top-10 left-2/4 -translate-x-2/4 mx-auto bg-dark-layer-1
                                  text-white p-2 rounded shadow-lg z-40 group-hover:scale-100
                                  scale-0 transition-all duration-300 ease-in-out`
    return (
      <nav className={`relative flex h-[75 px] w-full shrink-0 items-center px-5
                      ${user != null ? "bg-gray-900" : "bg-dark-gray-5"} text-dark-gray-7`}>
        {/* <div className="flex w-full items-center justify-between max-w-[1300px] mx-auto"> */}
        <div className="flex w-full items-center max-w-[1300px] mx-auto">
          <Link href="/" className="h-[75px]">
            <div style={{ position: 'relative', height: '63px', width: '170px' }}>
              <Image src="/images/logo-large.png"
                     alt="TeacherCollab"
                     fill
                     sizes="170px"
                     style={{ objectFit: 'contain' }}
                     priority
              />
            </div>
          </Link>
          
          {user != null &&  // The user is logged in
            <div>
              <div className="ml-6 text-[36px] text-white font-semibold flex items-center">
                { /* --- L E A R N I N G   S E Q U E N C E S   B U T T O N --- */ }
                <div className="cursor-pointer group relative">
                  <button onClick   = {toggleSidebar}
                          className = "mr-8">
                    <Menu size={24} />
                  </button>
                  
                  { /* on hover change the scale from 0% (invisible) to 100% */}
                  <div className={hoverEffectClassName}>
                    <p className="text-sm text-center">Learning Sequences</p>
                  </div>
                </div>
                
                Teacher Rehearsal Space
              </div>
              <div className="ml-20 text-[16px] text-gray-400 flex items-center">
                Practice collaborative sense-making around student dialogues in a simulated environment.
              </div>
            </div>
          }
          {allProblemsCompleted &&
            <div className="flex items-center space-x-4 flex-1 justify-end">
              <button onClick   = { endSession }
                      className = "mr-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow">
                End Session
              </button>
            </div>
          }
          {!allProblemsCompleted && currProblemCompleted &&
            <div className="flex items-center space-x-4 flex-1 justify-end">
              <button onClick   = { nextProblem }
                      className = "mr-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow">
                Next
              </button>
            </div>
          }
          
          <div className="flex items-center space-x-4 flex-1 justify-end">
            {
              !user && ( // The user is not logged in
              <div>
                <Link href="/auth">
                  <button className="bg-dark-fill-3 py-1 px-2 cursor-pointer rounded">
                    Sign In
                  </button>
                </Link>
              </div>
              )
            } 
            
            {user && ( // The user is logged in
              <>
                  {/* --- S P E E C H   B U T T O N --- */}
                  {settings && (
                  <>
                    <div className="cursor-pointer group relative">
                      <button className="text-gray-300 hover:text-white transition"
                              title    ="Toggle Pesona Speech"
                              onClick  ={() => {
                                  if (settings.speech) {
                                      // The speech is ON and are are about to turn it OFF
                                      // Stop any sound that may be playing
                                      SpeechUtil.getInstance().cancelSpeech();
                                  }
                                  setSettings(prev => prev ?
                                                      {...prev, speech: !prev.speech } : prev);
                              }}
                      >
                        <Image src   ={settings.speech ? "/images/voice_on.png" :
                                                         "/images/voice_off.png"}
                               alt   ={settings.speech ? "Persona Speech: ON" :
                                                         "Persona Speech: OFF"}
                               height={30}
                               width ={30}
                        />
                      </button>
                      { /* on hover change the scale from 0% (invisible) to 100% */}
                      <div className={hoverEffectClassName}>
                        <p className="text-sm text-center">
                          {settings.speech ? "Speech ON" : "Speech OFF"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                
                {/* --- S E T T I N G S   B U T T O N --- */}
                {settings && user.isAdmin && (
                  <>
                    <div className="cursor-pointer group relative">
                      <button className="text-gray-300 hover:text-white transition"
                              title    ="Settings"
                              onClick  ={() => setSettingsOpen(true)}
                      >
                        <SettingsIcon size={24} />
                      </button>
                      { /* on hover change the scale from 0% (invisible) to 100% */}
                      <div className={hoverEffectClassName}>
                        <p className="text-sm text-center">Settings</p>
                      </div>
                    </div>
                  </>
                )}

                {/* --- D A T A B A S E   B U T T O N --- */}
                {settings && user.isAdmin && (
                  <>
                    <div className="cursor-pointer group relative">
                      <button className="text-gray-300 hover:text-white transition"
                              title    ="Database Management"
                              onClick  ={() => setDbModalOpen(true)}
                      >
                        <Database size={24} />
                      </button>
                      { /* on hover change the scale from 0% (invisible) to 100% */}
                      <div className={hoverEffectClassName}>
                        <p className="text-sm text-center">Database</p>
                      </div>
                    </div>
                  </>
                )}
                
                { /* --- P R O F I L E   I M A G E --- */ }
                <div className="cursor-pointer group relative">
                  <Image src="/images/user.png"
                         width={100}
                         height={100}
                         alt="Profile image"
                         className="h-8 w-8 roudned full"
                  />
                  { /* on hover change the scale from 0% (invisible) to 100% */}
                  <div className={hoverEffectClassName}>
                    <p className="text-sm text-center">{user.name}</p>
                  </div>
                </div>
                
                { /* --- L O G O U T   B U T T O N --- */ }
                <div className="cursor-pointer group relative">
                  <LogoutButton />
                  { /* on hover change the scale from 0% (invisible) to 100% */}
                  <div className={hoverEffectClassName}>
                    <p className="text-sm text-center">Logout</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {settings && user?.isAdmin && (
          <>
            <SettingsModal isOpen     ={settingsOpen}
                           onClose    ={() => setSettingsOpen(false)}
                           settings   ={settings!}
                           setSettings={setSettings}
            />
            <DatabaseModal isOpen ={dbModalOpen}
                           onClose={() => setDbModalOpen(false)}
            />
          </>
        )}
      </nav>
    );
};
export default Topbar;

