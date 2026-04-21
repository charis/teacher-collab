// Library imports
import React, { useState } from 'react';
// Custom imports
import { ErrorMessage, showError, showSuccess } from "@/util/UIUtil";
import { sendEmail } from "@/util/EmailUtil";
import { EmailType } from "@/types";

type ResetPasswordProps = {
    showModal: (type: 'login' | 'signup' | 'forgotPassword') => void
};

const ResetPassword:React.FC<ResetPasswordProps> = ({showModal}) => {
    // ---------------------------   S T A T E   ---------------------------- //
    /** Keeps track of email address error */
    const [validationError, setValidationError] = useState<string | null>(null);
    /**
     * {@code true} if we are waiting for a server response or
     * {@code false} otherwise
     */
    const [waiting, setWaiting] = useState<boolean>(false);
    
    /**
     * Registers the user to our database.
     */
    async function submitForm(data: FormData) {
        // Do not accept another login request till we hear from the server
        setWaiting(true);
        // Wipe out any previous validation error
        setValidationError(null);
        
        const { email } = Object.fromEntries(data);
        if ((email as string).length < 5) {
            setValidationError('Invalid email address');
            setWaiting(false);
            return;
        }
        
        try {
            await sendEmail(email as string, EmailType.RESET_PASSWORD);
            showSuccess('We sent you an email with a link to reset your password.');
            showModal('login');
        }
        catch { // We are not using the error => no need for: 'catch (error){...}')
            showError('Either ' + email + ' does not exist or an error occurred. Try again.');
        }
        finally {
            setWaiting(false);
        }
    }
    
    return (
      <form className="space-y-6 px-6 lg:px-8 pb-4 sm:pb-6 xl:pb-8"
             action={submitForm}
      >
        <h3 className="text-xl font-medium  text-white text-center">Reset your password</h3>
        <p className="text-sm text-white text-center">
         Enter your email address and we&apos;ll send you instructions on how to reset the password.
        </p>
        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-2 text-gray-300">
            Email
          </label>
          <input type="email"
                 name="email"
                 id="email"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-white"
                 placeholder="Enter your e-mail here"
          />
          {validationError &&
            <ErrorMessage message={validationError} />
          }
        </div>
        <button type="submit"
                className="w-full text-white focus:ring-4 focus:ring-blue-300 font-medium rounded-lg
                           text-sm px-5 py-2.5 text-center bg-cardinal-red hover:bg-cardinal-red-s"
        >
          {waiting ? 'Sending email...' : 'Reset Password'}
        </button>
      </form>
    );
};
export default ResetPassword;