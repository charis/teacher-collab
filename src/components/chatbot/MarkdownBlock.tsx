// Library imports
import { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeExternalLinks from 'rehype-external-links';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import prism from 'react-syntax-highlighter/dist/esm/styles/prism/prism';
import 'prismjs/themes/prism.css';
// Custom imports
import TextCopyButton from "@/components/TextCopyButton";

type MarkdownBlockPros = {
    content: string
};

type CodeProps = {
    inline?      : boolean;
    className?   : string;
    children?    : React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;


const MarkdownBlock:React.FC<MarkdownBlockPros> = ({ content }) => {
    // Add the CodeCopyBtn component to our PRE element
    const Pre: React.FC<React.HTMLAttributes<HTMLPreElement>> = ({ children,...props }) => {
        const codeElement = children as ReactElement<{children: React.ReactNode|React.ReactNode[]}>;
        const innerChildren = codeElement.props.children;
        const textTemp = Array.isArray(innerChildren) ? innerChildren[0] : innerChildren;
        
        // Ensure that text is a string before passing it to the button
        const text = typeof textTemp === 'string' ? textTemp : '';
        
        return (
            <pre {...props} className="code-block relative">
              <TextCopyButton getText={() => text}
                              className="absolute top-4 right-4" />
              {children}
            </pre>
        );
    };
    
    // Custom Code component for syntax highlighting
    const Code: React.FC<CodeProps> = ({ inline, className = 'bg-cyan-600 text-white', children, ...props }) => {
      const languageMatch = /language-(\w+)/.exec(className || '');
      
      return (!inline && languageMatch) ? (
        <SyntaxHighlighter {...props}
                           style    = {prism}
                           language = {languageMatch[1]}
                           PreTag   = "div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    };
    
    return (
        <ReactMarkdown rehypePlugins={[
                           // Add rehype plugins (e.g., rehypeRaw) to the array as needed,
                           [rehypeExternalLinks, { target: '_blank',
                                                   rel   : ['noopener', 'noreferrer'] }],
                       ]}
                       remarkPlugins={[remarkGfm]} // Add remark plugins (e.g., remarkGfm) to the array as needed
                       components ={{
                           pre: Pre,
                           code: Code
                       }}
        >
          {content}
        </ReactMarkdown>
    );
};
export default MarkdownBlock;