"use client";

// Library imports
import { HTMLAttributes, useState } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';
// Custom imports
import { cn } from "@/util/utils";


interface TextCopyButtonProps extends HTMLAttributes<HTMLDivElement> {
    /** Function that returns the text to be copied to the clipboard */
    getText: () => string
};

const TextCopyButton:React.FC<TextCopyButtonProps> = ({ getText, className, ...props }) => {
    const [textCopied, setTextCopied] = useState(false);
    
    /**
     * Copies the code editor text to the clipboard
     */
    const copyToClipboard = async () => {
        const text = getText();
        console.log(text);
        try {
            await navigator.clipboard.writeText(text);
            setTextCopied(true);
            setTimeout(() => {
                setTextCopied(false);
            }, 2000);    
        }
        catch (error) {
            console.error('Unable to copy text:', error);
        }
    }

    return (
        <div {...props} className={cn(
            `text-xl text-gray-400 cursor-pointer hover:scale-110 hover:opacity-90`, className
        )}>
          {textCopied ? <FaCheck className= "text-success-green" /> :
                        <FaCopy onClick={copyToClipboard} />
          }
        </div>
    );
}
export default TextCopyButton;
