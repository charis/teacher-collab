// Library imports
import { IoClose } from 'react-icons/io5';
// Custom imports
import Login from "./Login";
import Signup from "./Signup";
import ResetPassword from "./ResetPassword";
import EscapeHandler from "@/app/hooks/useEscape";
import { AuthModalState } from "@/types";

type AuthModalProps = {
    authModalState: AuthModalState,
    updateAuthModalStateChange: (newState: AuthModalState) => void;
};

const AuthModal:React.FC<AuthModalProps> = ({authModalState, updateAuthModalStateChange}) => {
    /**
     * Shows the AuthModal with the given type.
     * 
     * @param {'login' | 'signup' | 'forgotPassword'} type The AuthModal type 
     */
    const showModal = (type: 'login' | 'signup' | 'forgotPassword') => {
        updateAuthModalStateChange({ ...authModalState, type: type });
    }

    /**
     * Closes the AuthModal
     */
    const closeModal = () => {
        updateAuthModalStateChange({ ...authModalState, isOpen: false });
    };
    
    /**
     * Closes the AuthModal when the user presses the ESC key
     */
    EscapeHandler(closeModal);
    
    return (
      <>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60"
             onClick={closeModal}
        ></div>
        <div className="w-full sm:w-[450px] absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] flex justify-center items-center"
        >
          <div className="relative w-full h-full mx-auto flex items-center justify-center">
            <div className="bg-white rounded-lg shadow relative w-full bg-gradient-to-b from-cardinal-red to-slate-900 mx-6"
            >
              <div className="flex justify-end p-2">
                <button type="button"
                        className="bg-transparent rounded-lg text-sm p-1.5 ml-auto inline-flex items-center hover:bg-gray-800 hover:text-white text-white"
                        onClick  ={closeModal}
                > {/* Close Button */}
                  <IoClose className="h-5 w-5" />
                </button>
              </div>
              {/* Show the proper modal based on the authModal type */}
              { authModalState.type === 'login' ?
                 <Login showModal={showModal} /> :
                 authModalState.type === 'signup' ? <Signup showModal={showModal} /> :
                                                    <ResetPassword showModal={showModal}/>
              }
            </div>
          </div>
        </div>
      </>
    );
};
export default AuthModal;