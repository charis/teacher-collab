"use client";

// Library imports
import { SessionProvider } from 'next-auth/react';

type AuthProvidersProps = {
    children: React.ReactNode;
};

/**
 * Session-provider wrapper
 */
const AuthProvider:React.FC<AuthProvidersProps> = ({children}) => {
    return (
        <SessionProvider>{children}</SessionProvider>
    );
}
export default AuthProvider;