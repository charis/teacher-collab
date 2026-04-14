// Library imports
import { IoClose } from 'react-icons/io5';
import { useState, useEffect, useRef } from 'react';
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import "@/styles/react-tabs.css";
// Custom imports
import EscapeHandler from "@/app/hooks/useEscape";
import { updateSettings, getPersonas, updatePersonaFields } from "@/util/DBUtil";
import { DBPersona, DBSettingsSwitch, Settings } from "@/types";

type SettingsModalProps = {
    isOpen          : boolean;
    onClose         : () => void;
    settings        : Settings;
    setSettings     : React.Dispatch<React.SetStateAction<Settings | null>>;
    selectedCategory: string | null;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen,
                                                       onClose,
                                                       settings,
                                                       setSettings,
                                                       selectedCategory }) => {
    // ---------------------------   S T A T E   ---------------------------- //
    const [textValue, setTextValue] = useState(settings.global_instructions ?? "");
    
    // Persona state
    const [personas,              setPersonas]              = useState<DBPersona[]>([]);
    const [personaInstructions,   setPersonaInstructions]   = useState<Record<string, string>>({});
    const [personaDescriptions,   setPersonaDescriptions]   = useState<Record<string, string>>({});
    const [personaInitialMsgs,    setPersonaInitialMsgs]    = useState<Record<string, string>>({});
    const [personaSkills,         setPersonaSkills]         = useState<Record<string, string>>({});
    const [isLoadingPersonas,     setIsLoadingPersonas]     = useState(false);
    const [activeTabIndex,        setActiveTabIndex]        = useState(0);
    
    // Ref to prevent state updates after the effect is cleaned up
    const cancelledRef = useRef(false);
    
    // ESC key handler
    EscapeHandler(() => {
        if (isOpen) {
            onClose();
        }
    });
    
    /**
     * Fetches all personas from the database and initializes the
     * persona instructions map for editing. Checks {@link cancelledRef}
     * before updating state to avoid updates after the effect cleanup.
     */
    async function loadPersonas() {
        try {
            const dbPersonas: DBPersona[] = await getPersonas();
            if (cancelledRef.current) {
                return;
            }

            // Filter by selected category (show all if no category selected)
            const filtered = selectedCategory
                ? dbPersonas.filter(p => p.category === selectedCategory)
                : dbPersonas;
            setPersonas(filtered);
            
            const instructionsMap: Record<string, string> = {};
            const descriptionsMap: Record<string, string> = {};
            const initialMsgsMap: Record<string, string> = {};
            const skillsMap:      Record<string, string> = {};
            for (const persona of dbPersonas) {
                instructionsMap[persona.personaId] = persona.instructions ?? "";
                descriptionsMap[persona.personaId] = persona.description ?? "";
                initialMsgsMap[persona.personaId]  = persona.initialMessage ?? "";
                skillsMap[persona.personaId]        = persona.skills ?? "";
            }

            setPersonaInstructions(instructionsMap);
            setPersonaDescriptions(descriptionsMap);
            setPersonaSkills(skillsMap);
            setPersonaInitialMsgs(initialMsgsMap);
            setIsLoadingPersonas(false);
        }
        catch (error) {
            if (cancelledRef.current) {
                return;
            }
            console.error("Failed to load personas:", error);
            setIsLoadingPersonas(false);
        }
    }
    
    // Fetch personas when modal opens
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        
        cancelledRef.current = false;
        setIsLoadingPersonas(true);
        setActiveTabIndex(0);
        
        loadPersonas();
        
        return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedCategory]);
    
    if (!isOpen) {
        return null;
    }
    
    const handleApply = async () => {
        // 1) Save global settings (existing logic)
        const switchesForDB: DBSettingsSwitch[] = settings.switches.map(curr_switch => ({
            id                  : curr_switch.id,
            isEnabled           : curr_switch.isEnabled,
            isMutualExclusive   : curr_switch.isMutualExclusive,
            selectedOptionIndex : Array.isArray(curr_switch.selection)? null: curr_switch.selection,
            option1_label       : curr_switch.option1_label,
            option1             : curr_switch.option1,
            option2_label       : curr_switch.option2_label,
            option2             : curr_switch.option2,
            option3_label       : curr_switch.option3_label,
            option3             : curr_switch.option3,
            option4_label       : curr_switch.option4_label,
            option4             : curr_switch.option4,
            option5_label       : curr_switch.option5_label,
            option5             : curr_switch.option5,
        }));
        
        await updateSettings({
            global_instructions: textValue,
            switches: switchesForDB
        });
        
        setSettings((prev) => ({
            ...prev!,
            global_instructions: textValue,
        }));
        
        // 2) Save persona fields (only changed ones)
        const updates: { personaId: string;
                         description?: string;
                         initialMessage?: string;
                         instructions?: string | null;
                         skills?: string | null }[] = [];
        for (const persona of personas) {
            const changed: typeof updates[number] = { personaId: persona.personaId };
            let hasChanges = false;

            const newDesc = personaDescriptions[persona.personaId] ?? "";
            if (newDesc !== (persona.description ?? "")) {
                changed.description = newDesc;
                hasChanges = true;
            }

            const newInitMsg = personaInitialMsgs[persona.personaId] ?? "";
            if (newInitMsg !== (persona.initialMessage ?? "")) {
                changed.initialMessage = newInitMsg;
                hasChanges = true;
            }

            const newInstructions = personaInstructions[persona.personaId] ?? "";
            if (newInstructions !== (persona.instructions ?? "")) {
                changed.instructions = newInstructions.trim() || null;
                hasChanges = true;
            }

            const newSkills = personaSkills[persona.personaId] ?? "";
            if (newSkills !== (persona.skills ?? "")) {
                changed.skills = newSkills.trim() || null;
                hasChanges = true;
            }

            if (hasChanges) {
                updates.push(changed);
            }
        }

        if (updates.length > 0) {
            await updatePersonaFields(updates);
            // Reload to pick up updated persona data across all views
            window.location.reload();
            return;
        }

        onClose();
    };
    
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40"
             onClick  ={onClose}
        />
        
        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center z-50"
             onClick  ={(e) => e.stopPropagation()} // Prevent click-through
        >
          <div className="bg-white rounded-lg shadow relative w-full sm:w-[600px] mx-6
                          bg-gradient-to-b from-cardinal-red to-slate-900 p-6"
          >
            {/* Close Button */}
            <div className="flex justify-end -mt-2 -mr-2">
              <button type     ="button"
                      className="bg-transparent rounded-lg text-sm p-1.5 inline-flex
                                 items-center hover:bg-gray-800 hover:text-white text-white"
                      onClick  ={onClose}
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>
            
            {/* Tabbed Content */}
            <Tabs selectedIndex={activeTabIndex}
                  onSelect     ={(i: number) => setActiveTabIndex(i)}
            >
              <TabList className="flex gap-1 mb-4 border-b border-slate-600
                                  overflow-x-auto bg-transparent p-0">
                <Tab className="px-4 py-2 text-sm text-gray-300 cursor-pointer rounded-t
                                hover:text-white hover:bg-slate-700 focus:outline-none
                                border-b-2 border-transparent"
                     selectedClassName="!text-white !border-b-2 !border-blue-500
                                        !bg-slate-700"
                >
                  General
                </Tab>
                {!isLoadingPersonas && personas.map((persona) => (
                  <Tab key      ={persona.personaId}
                       className="px-4 py-2 text-sm text-gray-300 cursor-pointer rounded-t
                                  hover:text-white hover:bg-slate-700 focus:outline-none
                                  whitespace-nowrap border-b-2 border-transparent"
                       selectedClassName="!text-white !border-b-2 !border-blue-500 !bg-slate-700"
                  >
                    {persona.name}
                  </Tab>
                ))}
              </TabList>
              
              {/* General Tab Panel */}
              <TabPanel>
                <div className="max-h-[60vh] overflow-y-auto">
                  {/* Agent Instructions */}
                  <div className="text-white mt-2">
                    <label className="block text-xl font-medium mb-2">
                      Agent Instructions
                    </label>
                    <textarea className="w-full px-3 py-2 text-black bg-white rounded border
                                         border-gray-300 focus:outline-none focus:ring-2
                                         focus:ring-blue-500"
                              rows     ={5}
                              value    ={textValue}
                              onChange ={(e) => setTextValue(e.target.value)}
                    />
                  </div>
                  
                  {/* Agent Selection Group */}
                  <div className="mt-6 bg-slate-800 rounded-xl p-4 mb-6 border border-slate-600">
                    <h2 className="text-xl font-semibold text-white mb-4">Agent Selection</h2>
                    <div className="flex flex-col space-y-4 mb-6">
                      {settings.switches.filter((s) => s.isEnabled).map((switchItem, idx) => {
                        const labels = Array.from({ length: 5 }, (_, i) => {
                          const labelKey = `option${i + 1}_label` as keyof typeof switchItem;
                          const valueKey = `option${i + 1}` as keyof typeof switchItem;

                          return switchItem[labelKey] && switchItem[valueKey]?
                                 {
                                   label: switchItem[labelKey] as string,
                                   value: switchItem[valueKey] as string,
                                   index: i + 1
                                 } : null;
                        }).filter(Boolean) as { label: string; value: string, index: number }[];
                        
                        const isMultiSelect = !switchItem.isMutualExclusive;
                        const selection = switchItem.selection;
                        
                        const isSelected = (index: number) => {
                          return isMultiSelect?
                            Array.isArray(selection) && selection.includes(index) :
                            selection === index;
                        };
                        
                        return (
                          <div key      ={switchItem.id}
                               className="flex flex-col space-y-2 text-white mb-2"
                          >
                            <label className="block text-sm text-white mb-1">
                              {isMultiSelect ? "Select any from the following:" :
                                               "Select exactly one from the following:"}
                            </label>
                            
                            <div className="flex space-x-2 flex-wrap">
                              {labels.map(({ label, value, index }) => (
                                <button key      ={index}
                                        title    ={value}
                                        className={`px-3 py-1 rounded
                                                    ${isSelected(index)?
                                                      "bg-blue-600 text-white" :
                                                      "bg-gray-300 text-black" }`}
                                        onClick  ={() => {
                                          setSettings((prev) => {
                                            if (!prev) {
                                              return prev;
                                            }
                                            
                                            const updatedSwitches = [...prev.switches];
                                            const currSwitch = updatedSwitches[idx];
                                            
                                            const newSelection: number | number[] =
                                              isMultiSelect?
                                              (currSwitch.selection as number[]).includes(index)?
                                                  (currSwitch.selection as number[]).filter(
                                                      (n)=> n !== index
                                                  ) : [...(currSwitch.selection as number[]), index]
                                              : index;
                                            
                                            updatedSwitches[idx] = {
                                              ...currSwitch,
                                              selection: newSelection,
                                            };
                                            
                                            return {
                                              ...prev,
                                              switches: updatedSwitches,
                                            };
                                          });
                                        }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabPanel>
              
              {/* Persona Tab Panels */}
              {!isLoadingPersonas && personas.map((persona) => (
                <TabPanel key={persona.personaId}>
                  <div className="max-h-[60vh] overflow-y-auto text-white space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Name
                      </label>
                      <p className="text-lg font-semibold">{persona.name}</p>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-black bg-white rounded border
                                   border-gray-300 focus:outline-none focus:ring-2
                                   focus:ring-blue-500"
                        rows    ={3}
                        value   ={personaDescriptions[persona.personaId] ?? ""}
                        onChange={(e) => {
                          setPersonaDescriptions(prev => ({
                            ...prev,
                            [persona.personaId]: e.target.value
                          }));
                        }}
                      />
                    </div>

                    {/* Initial Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Initial Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-black bg-white rounded border
                                   border-gray-300 focus:outline-none focus:ring-2
                                   focus:ring-blue-500"
                        rows    ={3}
                        value   ={personaInitialMsgs[persona.personaId] ?? ""}
                        onChange={(e) => {
                          setPersonaInitialMsgs(prev => ({
                            ...prev,
                            [persona.personaId]: e.target.value
                          }));
                        }}
                      />
                    </div>
                    
                    {/* Instructions (editable) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Instructions
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-black bg-white rounded border
                                   border-gray-300 focus:outline-none focus:ring-2
                                   focus:ring-blue-500"
                        rows    ={5}
                        value   ={personaInstructions[persona.personaId] ?? ""}
                        onChange={(e) => {
                          setPersonaInstructions(prev => ({
                            ...prev,
                            [persona.personaId]: e.target.value
                          }));
                        }}
                      />
                    </div>

                    {/* Skills (editable) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Skills
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-black bg-white rounded border
                                   border-gray-300 focus:outline-none focus:ring-2
                                   focus:ring-blue-500"
                        rows    ={4}
                        value   ={personaSkills[persona.personaId] ?? ""}
                        onChange={(e) => {
                          setPersonaSkills(prev => ({
                            ...prev,
                            [persona.personaId]: e.target.value
                          }));
                        }}
                      />
                    </div>
                  </div>
                </TabPanel>
              ))}
            </Tabs>
            
            {isLoadingPersonas && (
              <p className="text-gray-400 text-sm mt-2">Loading personas...</p>
            )}
            
            <div className="mt-6 flex justify-end space-x-4">
              <button className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded shadow"
                      onClick  ={onClose}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                      onClick  ={handleApply}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </>
    );
};

export default SettingsModal;
