"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { validateVerificationToken } from "@/util/ServerActions";

type VerifyUserProps = {
    token: string;
};

// Keep the async signature for the component as per the requirement
const VerifyUser: React.FC<VerifyUserProps> = ({ token }) => {
    // Use useState to manage the state (no issue with hooks here)
    const [verified, setVerified] = useState<boolean | null>(null);

    // Wrapping async token validation in a function inside useEffect
    useEffect(() => {
        const validateToken = async (token: string) => {
            const validToken = await validateVerificationToken(token);
            setVerified(validToken);
        };

        // Call the async function after the component mounts
        validateToken(token);
    }, [token]); // Runs when token changes

    return (
        <main className="bg-gradient-to-b from-gray-600 to-black min-h-screen">
            <nav className="relative flex h-[50px] w-full shrink-0 items-center px-5 bg-dark-layer-1 text-dark-gray-7">
                <div className="flex w-full items-center justify-between mx-auto">
                    <Link href="/">
                        <Image src="/images/logo-large.png" alt="TeacherCollab" height={170} width={170} />
                    </Link>
                </div>
            </nav>

            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <Image src="/images/email-verified.png" alt="Verified Email image" height={200} width={200} />

                {/* Loading Spinner */}
                {verified === null && <div className="spinner mb-4" />}

                {/* Title for 'Successfully Verified' case */}
                {verified === true && <h1 className="mt-2 p-2 text-2xl text-white center">Email Verified</h1>}

                {/* Title for 'Verification Failed' case */}
                {verified === false && <h1 className="mt-2 p-2 text-2xl text-white center">Verification Failed</h1>}

                {/* Text in each case: {loading, success, failure} */}
                <h2 className="text-lg text-white">
                    {verified === null ? "Verifying your email..." :
                    (verified === true ? "Your account was successfully verified" :
                    "The verification token is invalid or expired")}
                </h2>

                {/* Link for 'Successfully Verified' case */}
                {verified === true && (
                    <Link className="mt-4 px-4 py-2 text-lg rounded-lg bg-green-600 hover:bg-green-500 text-white" href="/auth">
                        CONTINUE
                    </Link>
                )}

                {/* Link for 'Verification Failed' case */}
                {verified === false && (
                    <Link className="mt-4 px-4 py-2 text-lg rounded-lg bg-green-600 hover:bg-green-500 text-white" href="/auth">
                        TRY AGAIN
                    </Link>
                )}
            </div>
        </main>
    );
};

export default VerifyUser;
