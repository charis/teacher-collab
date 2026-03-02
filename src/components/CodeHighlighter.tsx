"use client";

// Library imports
import React, { useEffect, useState } from 'react';
import { PrismAsyncLight as DefaultSyntaxHighlighter} from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeHighlighterProps {
    code    : string;
    language: string;
};

export function CodeHighlighter({ code, language }: CodeHighlighterProps) {
    // ---------------------------   S T A T E   ---------------------------- //
    const [SyntaxHighlighter, setSyntaxHighlighter] =
                                       useState<typeof DefaultSyntaxHighlighter | null>(null);
    const [mounted, setMounted] = useState(false);
    const [copied,  setCopied]  = useState(false);
    
    // Map common language aliases to their proper names
    const languageMap: Record<string, string> = {'js'   : 'javascript',
                                                 'ts'   : 'typescript',
                                                 'py'   : 'python',
                                                 'sh'   : 'bash',
                                                 'shell': 'bash',
                                                 'md'   : 'markdown'};
    
    const normalizedLanguage = languageMap[language] || language;
    
    // Avoid hydration mismatch by only rendering after component mounts
    useEffect(() => {
        setMounted(true);
        import('react-syntax-highlighter').then((mod) => {
            setSyntaxHighlighter(() => mod.PrismAsyncLight);
        });
    }, []);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    
    if (!mounted || !SyntaxHighlighter) {
        // Return a placeholder with the same dimensions to avoid layout shift
        return (
          <div className="rounded-md overflow-hidden my-2 bg-gray-100">
            <div className={`bg-gray-800 text-white text-xs px-4 py-1 flex
                             justify-between items-center`}
            >
              <span>{language}</span>
              <button className="text-gray-300 hover:text-white">Copy</button>
            </div>
            <pre className="m-0 p-4">
              <code>{code}</code>
            </pre>
          </div>
        );
    }
    
    return (
      <div className="rounded-md overflow-hidden my-2">
        <div className={`bg-gray-800 text-white text-xs px-4 py-1 flex
                         justify-between items-center`}
        >
          <span>{language}</span>
          <button 
            className="text-gray-300 hover:text-white px-2 py-1 rounded"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="relative">
          <SyntaxHighlighter language={normalizedLanguage} 
                             style={vscDarkPlus}// Use imported style directly
                             customStyle={{ margin      : 0,
                                            padding     : '1rem',
                                            borderRadius:'0 0 0.375rem 0.375rem' }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
};
