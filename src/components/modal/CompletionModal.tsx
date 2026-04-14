// Library imports
import { IoClose } from 'react-icons/io5';
// Custom imports
import EscapeHandler from "@/app/hooks/useEscape";

type CompletionModalProps = {
    isOpen    : boolean;
    onClose   : () => void;
    onConfirm : () => void;
    surveyURL : string;
};

/**
 * Modal shown when the user finishes all teaching sequences and clicks Submit.
 * At this point the chat has NOT been marked complete yet — that happens only
 * when the user clicks "Complete the Survey" or "Skip".
 * Pressing ESC or X returns the user to the previous screen with the Submit
 * button still available.
 */
const CompletionModal: React.FC<CompletionModalProps> = ({ isOpen,
                                                           onClose,
                                                           onConfirm,
                                                           surveyURL }) => {
    EscapeHandler(() => {
        if (isOpen) {
            onClose();
        }
    });

    if (!isOpen) {
        return null;
    }

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40"
             onClick  ={onClose}
        />

        {/* Modal Container */}
        <div className="fixed inset-0 flex items-center justify-center z-50"
             onClick  ={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg shadow relative w-full sm:w-[500px] mx-6
                          bg-gradient-to-b from-cardinal-red to-slate-900 p-6"
          >
            {/* Close Button */}
            <div className="flex justify-end -mt-2 -mr-2">
              <button type     ="button"
                      className="bg-transparent rounded-lg text-sm p-1.5 inline-flex
                                 items-center hover:bg-gray-800 hover:text-white text-white"
                      onClick  ={onClose}
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="text-center text-white">
              <h2 className="text-2xl font-bold mb-3">
                Congratulations!
              </h2>
              <p className="text-gray-300 mb-6">
                You&apos;ve completed all the teaching sequences.
                Thank you for participating! We&apos;d love to hear your feedback.
              </p>

              <div className="flex flex-col gap-3">
                <a href     ={surveyURL}
                   target   ="_blank"
                   rel      ="noopener noreferrer"
                   className="w-full px-4 py-2.5 rounded-md bg-blue-500 hover:bg-blue-600
                              text-white font-semibold text-center transition-colors"
                   onClick  ={onConfirm}
                >
                  Complete the Survey
                </a>
                <button onClick  ={onConfirm}
                        className="w-full px-4 py-2.5 rounded-md border border-gray-500
                                   text-gray-300 hover:bg-slate-700 font-medium
                                   transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
};

export default CompletionModal;
