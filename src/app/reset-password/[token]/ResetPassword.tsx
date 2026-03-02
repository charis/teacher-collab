"use client";

// Library imports
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
// Custom imports
import type { NewPasswordError } from "@/types";
import { assertNewPasswordForm, resetPassword } from "@/util/ServerActions";
import { ErrorMessage } from "@/util/UIUtil";

type ResetPasswordProps = {
    token: string;
};

const ResetPassword:React.FC<ResetPasswordProps> = ({ token }) => {
    /** Keeps track of input validation errors */
    const [validationError, setValidationError] =
                            useState<NewPasswordError | null>(null);
    /** Keeps track of any errors while changing the password */
    const [error, setError] = useState<string | null>(null);
    /**
     * {@code true} if password was updated successfully,
     * {@code false} if the reset password token is invalid or has expired
     *               or another error happens and {@code null}
     *               initially/before validating the token to reset the password
     */
    const [success, setSuccess] = useState<boolean | null>(null);
    /**
     * {@code true} if we are waiting for a server response or
     * {@code false} otherwise
     */
    const [waiting, setWaiting] = useState<boolean>(false);

    /**
     * Changes the user password our database.
     */
    async function submitForm(data: FormData) {
        const validationError = await assertNewPasswordForm(data);
        
        if (validationError) {
            // Validation error
            setValidationError(validationError);
        }
        else { 
            // Wipe out any previous validation error
            setValidationError(null);
            // Do not accept another login request till we hear from the server
            setWaiting(true);
            const { newPassword } = Object.fromEntries(data);

            const passwordChanged = await resetPassword(token,
                                                        newPassword as string);
            if (!passwordChanged) {
                setError("Error changing the password. Make sure that your "
                       + "token has not expired and is valid");
            }
            setSuccess(passwordChanged);
            setWaiting(false);
        }
    }

    return (
        <main className="bg-gradient-to-b from-gray-600 to-black min-h-screen">
          <nav className="relative flex h-[50px] w-full shrink-0 items-center
                          px-5 bg-dark-layer-1 text-dark-gray-7">
            <div className="flex w-full items-center justify-between mx-auto">
              <Link href="/">
                <Image src   ="/images/logo-large.png"
                       alt   ="TeacherCollab"
                       height={170}
                       width ={170}
                />
              </Link>
            </div>
          </nav>
          <div className="flex justify-center items-center h-screen relative">
            { success === null &&
              <form className="space-y-6 px-6 pb-4"
                    action={submitForm}
              >
                <h3 className="pt-6 text-xl font-medium text-white">
                  Reset Password
                </h3>
                <div // -----   P A S S W O R D   T E X T   F I E L D   ----- //
                >
                  <label htmlFor  ="newPassword"
                         className="text-sm font-medium block mb-2
                                    text-gray-300">
                    New Password
                  </label>
                  <input type="password"
                         name="newPassword"
                         className="border-2 outline-none sm:text-sm rounded-lg
                                    focus:ring-blue-500 focus:border-blue-500
                                    block w-72 p-2.5 bg-white-600 text-black
                                    border-gray-500 placeholder-gray-400"
                         placeholder="Enter your new password here"
                  />
                  {validationError?.properties?.shape?.properties?.newPassword &&
                    <ErrorMessage
                       message={validationError.properties.shape.properties.newPassword.errors.join(',')}
                    />
                  }
                </div>
                <div // P A S S W O R D   C O N F I R M   T E X T   F I E L D //
                >
                  <label htmlFor  ="passwordConfirm"
                         className="text-sm font-medium block mb-2
                                    text-gray-300">
                    Password Confirm
                  </label>
                  <input type="password"
                         name="passwordConfirm"
                         className="border-2 outline-none sm:text-sm rounded-lg
                                    focus:ring-blue-500 focus:border-blue-500
                                    block w-72 p-2.5 bg-white-600 text-black
                                    border-gray-500 placeholder-gray-400"
                         placeholder="Enter again your new password here"
                  />
                  {validationError?.properties?.shape?.properties?.passwordConfirm &&
                    <ErrorMessage
                       message={validationError.properties.shape.properties.passwordConfirm.errors[0]}
                    />
                  }
                </div>
                <button // -  C H A N G E   P A S S W O R D   B U T T O N  - //
                        type="submit"
                        className="w-72 text-white focus:ring-blue-300
                                   font-medium rounded-lg text-sm px-5 py-2.5
                                   text-center bg-cardinal-red
                                   hover:bg-cardinal-red-s"
                >
                  {waiting ? 'Changing Password...' : 'Change Password'}
                </button>
                {error && <ErrorMessage message={error} /> }
              </form>
            }
            { success === true &&
              <div className="flex flex-col items-center justify-center
                              min-h-screen py-2">
                <Image src="/images/password-update-success.png"
                       alt="Passowrd reset success image"
                       height={200}
                       width={200}
                />
                <h1 className="mt-2 p-2 text-2xl text-white center">
                  Password Changed
                </h1>
                <h2 className="text-lg text-white">
                  Your password was successfully updated
                </h2>
                <Link className="mt-4 px-4 py-2 text-lg rounded-lg bg-green-600
                                 hover:bg-green-500 text-white"
                      href='/auth'>
                  CONTINUE
                </Link>
              </div>
            }
            { success === false &&
              <div className="flex flex-col items-center justify-center
                              min-h-screen py-2">
                <Image src="/images/password-update-error.png"
                       alt="Passowrd reset error image"
                       height={200}
                       width={200}
                />
                <h1 className="mt-2 p-2 text-xl rounded-lg bg-red-600
                               text-white">
                  Error Setting New Password
                </h1>
                <h2 className="mt-2 p-2 text-xl rounded-lg text-white">
                  Make sure that your token is valid and has not expired
                </h2>
                <div className="flex flex-row items-center justify-center py-4">
                  <div className="mx-2 px-4 py-2 text-lg rounded-lg bg-gray-600
                                  hover:bg-gray-500 text-white cursor-pointer"
                       onClick={() => window.location.reload()}>
                    Retry
                  </div>
                  <Link className="mx-2 px-4 py-2 text-lg rounded-lg bg-gray-600
                                   hover:bg-gray-500 text-white"
                        href='/auth'>
                    Abort
                  </Link>
                </div>
              </div>
            }
          </div>
        </main>
    );
}

export default ResetPassword;