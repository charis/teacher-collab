// Library imports
import Link from 'next/link';
import React from 'react';

type MarkdownLineProps = {    
    text: string
};

const MarkdownLine:React.FC<MarkdownLineProps> = ({ text }) => {
    // Regular expression for a link that has the following format:
    //     [link text](link URL)
    // E.g., [here](https://www.example.com/books)
    const linkRegex = /\[(.+?)\]\((.+?)\)/g;
    const parts = [];

    let lastIndex = 0;
    let match

    while ((match = linkRegex.exec(text)) !== null) {
        const [fullMatch, linkText, linkUrl] = match;
        const matchStart = match.index;
        const matchEnd = matchStart + fullMatch.length;

        if (lastIndex < matchStart) {
            parts.push(text.slice(lastIndex, matchStart));
        }

        parts.push(
            <Link className="break-words underline underline-offset-2 text-blue-600"
                  target="_blank"
                  rel="noopener noreferrer"
                  key={linkUrl}
                  href={linkUrl}          
            >
              {linkText}
            </Link>
        );

        lastIndex = matchEnd;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    
    return (
        <>
          {parts.map((part, i) => (
             <React.Fragment key={i}>{part}</React.Fragment>
          ))}
        </>        
    );
}
export default MarkdownLine;