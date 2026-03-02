"use client";

// Library imports
import { useState } from 'react';
// Custom imports
import type { NewPasswordError } from "@/types";
import { assertNewPasswordForm, resetPassword } from "@/util/ServerActions";
import { ErrorMessage } from "@/util/UIUtil";
import { extractFieldError } from "@/util/utils";

type NewPasswordProps = {
    resetPasswordToken: string
};

const NewPassword:React.FC<NewPasswordProps> = ({resetPasswordToken}) => {
    // ---------------------------   S T A T E   ---------------------------- //
    /** Keeps track of input validation errors */
    const [validationError, setValidationError] = useState<NewPasswordError | null>(null);
    /** Keeps track of any errors while changing the password */
    const [error, setError] = useState<string | null>(null);
    /**
     * {@code true} if we are waiting for a server response or
     * {@code false} otherwise
     */
    const [waiting, setWaiting] = useState<boolean>(false);

    // Precompute messages to avoid duplicate helper calls in JSX
    /** Extracts any validation messages related to the new password field */
    const newPasswordErrors     = extractFieldError(validationError, "newPassword");
    /** Extracts any validation messages related to the password confirmation field */
    const passwordConfirmErrors = extractFieldError(validationError, "passwordConfirm");
  
    /**
     * Changes the user password our database.
     */
    async function submitForm(data: FormData) {
        // Do not accept another login request till we hear from the server
        setWaiting(true);
        // Wipe out any previous error
        setValidationError(null);
        setError(null);
        
        const validationError = await assertNewPasswordForm(data);
        
        if (validationError) {
            // Validation error
            setValidationError(validationError);
            setWaiting(false);
            return;
        }
        
        const { newPassword } = Object.fromEntries(data);
        
        const success = await resetPassword(resetPasswordToken,
                                            newPassword as string);
        if (!success) {
            setError("Error changing the password. Make sure that your token has not expired "
                   + "and is valid");
        }
        setWaiting(false);
    }
    
    return (
      <form className="space-y-6 px-6 pb-4"
            action={submitForm}
      >
        <h3 className="text-xl font-medium text-white">Reset Password</h3>
        <div  // -----   P A S S W O R D   T E X T   F I E L D   ----- //
        >
          <label htmlFor="newPassword" className="text-sm font-medium block mb-2 text-gray-300">
            New Password
          </label>
          <input type="password"
                 name="newPassword"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-72 p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-black justify-center"
                 placeholder="Enter your new password here"
          />
          {newPasswordErrors.length > 0 &&
            <ErrorMessage message={newPasswordErrors.join(", ")} />
          }
        </div>
        <div  // -----   P A S S W O R D   C O N F I R M   T E X T   F I E L D   ----- //
        >
          <label htmlFor="passwordConfirm" className="text-sm font-medium block mb-2 text-gray-300">
            Password Confirm
          </label>
          <input type="password"
                 name="passwordConfirm"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-72 p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-black"
                 placeholder="Enter again your new password here"
          />
          {passwordConfirmErrors.length > 0 &&
            <ErrorMessage message={passwordConfirmErrors.join(", ")} />
          }
        </div>
        <button // -----   C H A N G E   P A S S W O R D   B U T T O N   ----- //
                type="submit"
                className="w-72 text-white focus:ring-blue-300 font-medium rounded-lg
                           text-sm px-5 py-2.5 text-center bg-cardinal-red hover:bg-cardinal-red-s"
        >
          {waiting ? 'Changing Password...' : 'Change Password'}
        </button>
        {error && <ErrorMessage message={error} /> }
      </form>
    );
};
export default NewPassword;