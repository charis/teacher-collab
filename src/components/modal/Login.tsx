"use client";

// Library imports
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
// Custom imports
import { AuthenticateError } from "@/types";
import { assertCredentials } from "@/util/ServerActions";
import { ErrorMessage } from "@/util/UIUtil";
import { extractFieldError } from "@/util/utils";


type LoginProps = {
    showModal: (type: 'login' | 'signup' | 'forgotPassword') => void
};

const Login:React.FC<LoginProps> = ({showModal}) => {
    // ---------------------------   S T A T E   ---------------------------- //
    /** Keeps track of input validation errors */
    const [validationError, setValidationError] = useState<AuthenticateError>(null);
    /** Keeps track of any user authentication errors */
    const [authError, setAuthError] = useState<string | null>(null);
    /**
     * {@code true} if we are waiting for a server response or
     * {@code false} otherwise
     */
    const [waiting, setWaiting] = useState<boolean>(false);
    
    /**
     * Authenticates the user against our database.
     */
    async function submitForm(data: FormData) {
        // Do not accept another login request till we hear from the server
        setWaiting(true);
        // Wipe out any previous validation error
        setValidationError(null);
        
        const validationError = await assertCredentials(data);
        
        if (validationError) {
            // Validation error
            setValidationError(validationError);
            setWaiting(false);
            return;
        }
        
        const { email, password } = Object.fromEntries(data) as { email?: string; password?: string };
        
        try {
            await signIn('credentials', {
                          username: email,
                          password: password,
                          redirect: true,
                          callbackUrl: '/'
                        });
        }
        catch (error) {
            if (error instanceof Error) {
                setAuthError(error.message);
            }
            else{
                setAuthError('User authentication form submission failed');
            }
        }
        finally {
            setWaiting(false);
        }
    }
    
    return (
      <form className="space-y-6 px-6 pb-4"
            action={submitForm}
      >
        <h3 className="text-xl font-medium text-white">Sign in to TeacherCollab</h3>
        <div  // -----   E M A I L   T E X T   F I E L D   ----- //
        >
          <label htmlFor="email" className="text-sm font-medium block mb-2 text-gray-300">
            Email
          </label>
          <input type="email"
                 name="email"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-black"
                 placeholder="Enter your e-mail here"
          />
          {extractFieldError(validationError, 'email').length > 0 && (
            <ErrorMessage message={ extractFieldError(validationError, 'email').join(',') } />
          )}
        </div>
        <div  // -----   P A S S W O R D   T E X T   F I E L D   ----- //
        >
          <label htmlFor="password" className="text-sm font-medium block mb-2 text-gray-300">
            Password
          </label>
          <input type="password"
                 name="password"
                 className="border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500
                            focus:border-blue-500 block w-full p-2.5 bg-white-600 border-gray-500
                            placeholder-gray-400 text-black"
                 placeholder="Enter your password here"
          />
          {extractFieldError(validationError, 'password').length > 0 && (
            <ErrorMessage message={ extractFieldError(validationError, 'password').join(',') } />
          )}
        </div>
        <button // -----   L O G I N   B U T T O N   ----- //
                type="submit"
                className="w-full text-white focus:ring-blue-300 font-medium rounded-lg
                           text-sm px-5 py-2.5 text-center bg-cardinal-red hover:bg-cardinal-red-s"
        >
          {waiting ? 'Logging in...' : 'Login'}
        </button>
        <button className="flex w-full justify-end" onClick={() => showModal('forgotPassword')}>
          <a href="#" className="text-sm block text-cardinal-red hover:underline w-full text-right">
            Forgot Password?
          </a>
        </button>
        <div className="text-sm font-medium text-gray-300">
          Don&apos;t have an account?&nbsp;
          <a href="#" className="text-blue-700 hover:underline" onClick={() => showModal('signup')}>
            Sign up
          </a>
        </div>
        {authError && <ErrorMessage message={authError} /> }
      </form>
    );
};
export default Login;