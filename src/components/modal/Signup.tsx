"use client";
// Library impots
import { useState } from 'react';
// Custom imports
import CustomCheckBox from "./CustomCheckBox";
import { EmailType, TreeifiedFieldError } from "@/types";
import { createUserInDB } from "@/util/ServerActions";
import { ErrorMessage, showError, showSuccess } from "@/util/UIUtil";
import { sendEmail } from "@/util/EmailUtil";
import { extractFieldError } from "@/util/utils";


type SignupProps = {
    showModal: (type: 'login' | 'signup' | 'forgotPassword') => void
};

const Signup:React.FC<SignupProps> = ({showModal}) => {
    // ---------------------------   S T A T E   ---------------------------- //
    /** Keeps track of input validation errors */
    const [validationError, setValidationError] = useState<TreeifiedFieldError | null>(null);
    /** Keeps track of any DB user creation errors */
    const [dbResult, setDBResult] = useState<string | null>(null);
    /**
     * {@code true} if we are waiting for a server response or
     * {@code false} otherwise
     */
    const [waiting, setWaiting] = useState<boolean>(false);
    
    /**
     * {@code true} if the user has administrative privileges or
     * {@code false} otherwise
     */
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    /** Plaintext admin password the user types when registering as admin. */
    const [adminPassword, setAdminPassword] = useState<string>("");
    
    // Precompute messages to avoid duplicate helper calls in JSX
    /** Extracts any validation messages related to the email field */
    const emailErrors    = extractFieldError(validationError, "email");
    /** Extracts any validation messages related to the display name field */
    const nameErrors     = extractFieldError(validationError, "name");
    /** Extracts any validation messages related to the password field */
    const passwordErrors = extractFieldError(validationError, "password");
    
    /**
     * Registers the user to our database.
     */
    async function submitForm(data: FormData) {
        // Do not accept another login request till we hear from the server
        setWaiting(true);
        // Wipe out any previous validation error
        setValidationError(null);
        setDBResult(null);
        
        const error = await createUserInDB(data, isAdmin);
        if (error && typeof error !== "string") {
            // Validation error — sanitize the structure
            const sanitizedError = {
                ...error,
                errors: (error.errors ?? []).map(String)
            } as TreeifiedFieldError;
            setValidationError(sanitizedError);
            return;
        }
        else if (error) {
            // DB / admin-gate error — surface the reason to the user.
            setDBResult(error);
            setWaiting(false);
            return;
        }
        
        // No errors
        // Send the user a verificatiom email(i.e., with token to verify the account)
        const { email } = Object.fromEntries(data)  as
                          { email?: string; name?: string; password?: string };
        try {
            await sendEmail(email as string, EmailType.ACCOUNT_VERIFICATION);
            showSuccess("User registered successfully. Please, check your email to verify"
                      + " your account.");
            showModal('login');
        }
        catch (error) {
            if (error instanceof Error) {
                showError('Sending verification email failed: ' + error.message);
            }
            else{
                showError('Sending verification email failed');
            }
        }

        setWaiting(false);
    }
    
    return (
      <form className="space-y-6 px-6 pb-4"
            action={submitForm}
      >
        <h3 className="text-xl font-medium text-white">Register to TeacherCollab</h3>
        <div  // -----   E M A I L   T E X T   F I E L D   ----- //
        >
          <label htmlFor="email"
                 className="text-sm font-medium block mb-2 text-gray-300">
            Email
          </label>
          <input type="email"
                 name="email"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-white"
                 placeholder="Enter your e-mail here"
          />
          {emailErrors.length > 0 && 
            <ErrorMessage message={emailErrors.join(", ")} />
          }
        </div>
        <div  // -----   N A M E   T E X T   F I E L D   ----- //
        >
          <label htmlFor="name"
                 className="text-sm font-medium block mb-2 text-gray-300">
            Display Name
          </label>
          <input type="text"
                 name="name"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-white"
                 placeholder="Enter your first and last name here"
          />
          {nameErrors.length > 0 &&
            <ErrorMessage message={nameErrors.join(", ")} />
          }
        </div>
        <div  // -----   P A S S W O R D   T E X T   F I E L D   ----- //
        >
          <label htmlFor="password" 
                 className="text-sm font-medium block mb-2 text-gray-300">
            Password
          </label>
          <input type="password"
                 name="password"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-white"
                 placeholder="Enter your password here"
          />
          {passwordErrors.length > 0 &&
            <ErrorMessage message={passwordErrors.join(", ")} />
          }
        </div>
        
        <button // -----   S I G N   U P   B U T T O N   ----- //
                type="submit" 
                className="w-full text-white focus:ring-blue-300 font-medium rounded-lg
                           text-sm px-5 py-2.5 text-center bg-cardinal-red hover:bg-cardinal-red-s"
        >
          {waiting ? 'Signing up...' : 'Sign up'}
        </button>
        
        <CustomCheckBox // -----   S E L E C T   U S E R   T Y P E   ----- //
                label="Register as Admin"
                className="bg-dark-gray-6 hover:bg-dark-fill-2 rounded-lg ml-1 text-white"
                onValueChange={(checked) => {
                    setIsAdmin(checked);
                    if (!checked) {
                        setAdminPassword("");
                    }
                }}
        />

        {isAdmin && (
          <div // -----   A D M I N   P A S S W O R D   ----- //
          >
            <label htmlFor="adminPassword"
                   className="text-sm font-medium block mb-2 text-gray-300">
              Admin Password
            </label>
            <input type     ="password"
                   name     ="adminPassword"
                   value    ={adminPassword}
                   onChange ={(e) => setAdminPassword(e.target.value)}
                   className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                              focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                              placeholder-gray-400 text-white"
                   placeholder="Enter the admin password"
            />
          </div>
        )}

        <div className="text-sm font-medium text-gray-300">
          Already have an account?&nbsp;
          <a href="#" className="text-blue-700 hover:underline" onClick={() => showModal('login')}>
            Log In
          </a>
        </div>
        {dbResult && <ErrorMessage message={dbResult} /> }
      </form>
    );
}
export default Signup;