// Library imports
import { toast } from 'react-toastify';
// Custom imports
import { TOAST_DURATION } from "@/constants";

// -------------------------------------------------------- //
//         S E R V E R - S I D E   F U N C T I O N S        //
// -------------------------------------------------------- //
// Those are functions that can be used on server or client side
type UIUtilProps = {
    message: string
};

/**
 * Displays a success message to the user.
 * 
 * @param {String} message - The success message to display
 */
export const SuccessMessage:React.FC<UIUtilProps> = ({message}) => {
    return (
      <div className="animate-pulse">
        <div className="flex p-2 mb-2 text-white bg-success-green rounded-lg"
             role="alert"
        >
          <svg className="inline flex-shrink-0 mr-3 w-5 h-5"
               fill="currentColor"
               viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9
                     9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
            />
          </svg>
          <div>
            <span className="font-sm">{message}</span>
          </div>
        </div>
      </div>
    );
}

/**
 * Displays a error message to the user.
 * 
 * @param {string} message - The error message to display
 */
export const ErrorMessage:React.FC<UIUtilProps> = ({message}) => {
    return (
      <div className="animate-pulse">
        <div className="flex p-2 mb-2 text-white bg-error-red rounded-lg"
             role="alert"
        >
          <svg className="inline flex-shrink-0 mr-3 w-5 h-5"
               fill="currentColor"
               viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000
                     2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"/>
          </svg>
          <div>
            <span className="font-sm">{message}</span>
          </div>
        </div>
      </div>
    );
}

/**
 * Displays an info message to the user.
 * 
 * @param {string} message - The info message to display
 */
export const InfoMessage:React.FC<UIUtilProps> = ({message}) => {
    return (
      <div className="animate-pulse">
        <div className="flex p-2 mb-2 text-white bg-info-blue rounded-lg"
             role="alert"
        >
          <svg className="inline flex-shrink-0 mr-3 w-5 h-5"
               fill="currentColor"
               viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000
                     2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"/>
          </svg>
          <div>
            <span className="font-sm">{message}</span>
          </div>
        </div>
      </div>
    );
}

/**
 * Displays an warning message to the user.
 * 
 * @param {string} message - The warning message to display
 */
export const WarningMessage:React.FC<UIUtilProps> = ({message}) => {
    return (
      <div className="animate-pulse">
        <div className="flex p-2 mb-2 text-white bg-warning-orange rounded-lg"
             role="alert"
        >
          <svg className="inline flex-shrink-0 mr-3 w-5 h-5"
               fill="currentColor"
               viewBox="0 0 20 20"
               xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000
                     2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"/>
          </svg>
          <div>
            <span className="font-sm">{message}</span>
          </div>
        </div>
      </div>
    );
}

// -------------------------------------------------------- //
//         C L I E N T - S I D E   F U N C T I O N S        //
// -------------------------------------------------------- //
// Those are functions that can be used only on client side
/**
 * Displays a success message to the user.
 * 
 * @param {string} message - The success message to display
 */
export function showSuccess(message: string) {
    toast.success(message, {
                      position: 'top-center',    // Show the message window at the top-center
                      autoClose: TOAST_DURATION, // Close the mesage window after 3sec
                      theme: 'dark'
                 }
    );
}

/**
 * Displays a error message to the user.
 * 
 * @param {string} message - The error message to display
*/
export function showError(message: string) {
    toast.error(message, {
                    position: 'top-center',    // Show the error window at the top-center
                    autoClose: TOAST_DURATION, // Close the error window after 3sec
                    theme: 'dark'
               }
    );
}

/**
 * Displays an info message to the user.
 * 
 * @param {string} message - The info message to display
 */
export function showInfo(message: string) {
    toast.success(message, {
                      position: 'top-center',    // Show the message window at the top-center
                      autoClose: TOAST_DURATION, // Close the mesage window after 3sec
                      theme: 'dark'
                 }
    );
}