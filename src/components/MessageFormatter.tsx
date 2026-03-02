"use client";

// Library imports
import React from 'react';
import dynamic from 'next/dynamic';
// Custom imports
import { CodeHighlighter } from "@/components/CodeHighlighter";

// Dynamically import ReactMarkdown to avoid SSR issues
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

interface MessageFormatterProps {
    content: string;
}

type Segment = {
    type     : 'text' | 'code';
    content  : string;
    language?: string;
}

// Helper function to parse the message content
function parseMessageContent(content: string): Segment[] {
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g;
    const segments: Segment[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        // Add the text before the code block
        if (match.index > lastIndex) {
            segments.push({
                type   : 'text',
                content: content.substring(lastIndex, match.index)
            });
        }
        
        // Add the code block
        segments.push({
            type    : 'code',
            language: match[1]?.trim() || 'plaintext',
            content : match[2]
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last code block
    if (lastIndex < content.length) {
        segments.push({
            type   : 'text',
            content: content.substring(lastIndex)
        });
    }
    
    return segments;
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({content}) => {
    // Parse the content to separate code blocks from regular text
    const segments = parseMessageContent(content);
    
    return (
      <div className="message-content">
        {segments.map((segment, index) => {
          if (segment.type === 'code') {
            return (
              <CodeHighlighter key     = {index} 
                               code    = {segment.content} 
                               language= {segment.language || 'plaintext'} 
              />
            )
          }
          else {
            return (
              <div key={index} className="prose prose-sm max-w-none">
                {React.createElement(ReactMarkdown, {}, segment.content)}
              </div>
            )
          }
        })}
      </div>
    );
};