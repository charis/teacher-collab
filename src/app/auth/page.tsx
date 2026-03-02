"use client";
// Library imports
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
// Custom imports
import AuthModal from "@/components/modal/AuthModal";
import Navbar from "@/components/Navbar";
import { showError } from "@/util/UIUtil";
import { AuthModalState } from "@/types";

const AuthPage: React.FC = () => {
    // We need to check if there is a session in order to display the modal
    const authenticated = useSession().status === 'authenticated';
    
    // Keep track of the state of the auth modal
    const [authModalState, setAuthModalState] = useState<AuthModalState>({
        isOpen: true,
        type  : 'login'
    });

    /**
     * Updates the AuthModalState
     * 
     * @param newState The new AuthModalState
     */
    const updateAuthModalStateChange = (newState: AuthModalState) => {
        setAuthModalState(newState);
    };

    /**
     * Shows the Login modal
     */
    const showLogin = () => {
        setAuthModalState({isOpen: true, type: 'login'});
    };

    /**
     * Called after the component is rendered to display errors (if any)
     */
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error')) {
            let error = urlParams.get('error');
            if (error === 'CredentialsSignin') {
                error = 'Invalid credentials or unverified user';
            }
            showError(error!);
        }
    }, []);

    return (
      <div className="bg-gradient-to-b from-gray-600 to-black h-screen
                      relative">
        <div className="max-w-7xl mx-auto">
          <Navbar showLogin={showLogin} authenticated={authenticated}/>
          <div className="flex items-center justify-center h-[calc(100vh-5rem)]
                          pointer-events-none select-none">
            <Image src   ="/images/banner.png"
                   alt   ="Banner image"
                   height={700}
                   width ={700}
            />
          </div>
          <div>
            { /* Show the child-component (e.g., Login, etc.) */ }
            { !authenticated && authModalState.isOpen &&
              <AuthModal authModalState={authModalState}
                         updateAuthModalStateChange={updateAuthModalStateChange}
              />
            }
          </div>
        </div>
      </div>
    );
}
export default AuthPage;