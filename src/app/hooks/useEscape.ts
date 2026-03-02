// Library imports
import { useEffect} from 'react';

/**
 * Executes the given function when the user presses Escape.
 * 
 * @param {() => void} func The function to execute
 */
const EscapeHandler = (funct: () => void) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                funct();
            }
        }
        window.addEventListener('keydown', handleEsc);
        // Cleanup / remove resources
        return () => window.removeEventListener('keydown', handleEsc);
    });
};
export default EscapeHandler;