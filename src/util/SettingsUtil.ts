// Custom imports
import { Settings } from "@/types";

/**
 * Determines if "Fixed Agent" mode is selected.
 *
 * Fixed Agent mode (option 1): Introduces agents sequentially one-on-one
 * Most Relevant Agent mode (option 2): Always selects most contextually
 * relevant agent
 *
 *
 * @param settings - The settings object containing switches
 * 
 * @returns {@code true} if Fixed Agent mode is selected, {@code false}
 *          otherwise (defaults to Most Relevant Agent)
 */
export function isFixedAgentMode(settings: Settings | null): boolean {
    if (!settings?.switches) {
        return false; // Default to Most Relevant Agent mode 
    }
    
    const agentModeSwitch = settings.switches.find(curr_switch =>
        curr_switch.isEnabled         &&
        curr_switch.isMutualExclusive &&
        (curr_switch.option1_label?.includes('Fixed Agent') ||
         curr_switch.option2_label?.includes('Most Relevant Agent'))
    );
    
    // Option 1 = Fixed Agent, Option 2 (or null/default) = Most Relevant Agent
    return agentModeSwitch?.selection === 1;
}

 