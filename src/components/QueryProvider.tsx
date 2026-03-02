"use client";
// Library imports
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

type ProvidersProps = {
    children: React.ReactNode;
};

/**
 * Session-provider wrapper
 */
const QueryProvider:React.FC<ProvidersProps> = ({children}) => {
    const queryClient = new QueryClient();
    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
export default QueryProvider;