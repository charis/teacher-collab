"use client"

// Library imports
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';
// Custom imports
import type { WhiteboardData } from '@/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

const Excalidraw = dynamic(
    () => import('@excalidraw/excalidraw').then(mod => mod.Excalidraw),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full text-gray-400">
                Loading whiteboard...
            </div>
        )
    }
);

interface WhiteboardProps {
    chatId      : number;
    transcriptId: number;
}

/** Debounce delay in ms before persisting whiteboard changes. */
const SAVE_DEBOUNCE_MS = 1500;

/**
 * Persists whiteboard data to the API (fire-and-forget).
 */
async function saveToServer(chatId: number,
                            transcriptId: number,
                            elements: Record<string, unknown>[]) {
    try {
        await fetch('/api/whiteboard', {
            method : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
                chatId,
                transcriptId,
                whiteboardData: { elements }
            })
        });
    }
    catch (error) {
        console.error('[Whiteboard] Failed to save:', error);
    }
}

/**
 * Fetches whiteboard data from the API.
 */
async function loadFromServer(chatId: number,
                              transcriptId: number): Promise<WhiteboardData | null> {
    try {
        const res = await fetch(`/api/whiteboard?chatId=${chatId}&transcriptId=${transcriptId}`);
        if (!res.ok) return null;
        const { whiteboardData } = await res.json();
        return whiteboardData ?? null;
    }
    catch {
        return null;
    }
}

/**
 * Excalidraw-based whiteboard component that auto-saves to the database.
 * Fetches its own data from the API on mount so it always has the latest state.
 */
export default function Whiteboard({ chatId, transcriptId }: WhiteboardProps) {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef      = useRef<Record<string, unknown>[] | null>(null);
    const initializedRef  = useRef(false);

    // Fetch and load whiteboard data from the API once the Excalidraw API is ready
    useEffect(() => {
        if (!excalidrawAPI || initializedRef.current) {
            return;
        }

        let cancelled = false;
        (async () => {
            const data = await loadFromServer(chatId, transcriptId);
            if (cancelled) return;

            if (data?.elements && data.elements.length > 0) {
                excalidrawAPI.updateScene({
                    elements: data.elements as unknown as
                        Parameters<ExcalidrawImperativeAPI['updateScene']>[0]['elements']
                });
            }
            initializedRef.current = true;
        })();

        return () => { cancelled = true; };
    }, [excalidrawAPI, chatId, transcriptId]);

    // Reset initialization flag when transcript changes
    useEffect(() => {
        initializedRef.current = false;
    }, [chatId, transcriptId]);

    // Flush any pending save on unmount (tab switch / transcript change)
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            if (pendingRef.current) {
                saveToServer(chatId, transcriptId, pendingRef.current);
                pendingRef.current = null;
            }
        };
    }, [chatId, transcriptId]);

    const handleChange = useCallback((elements: readonly Record<string, unknown>[]) => {
        if (!initializedRef.current) {
            return; // Skip saves during initial load
        }

        pendingRef.current = elements as Record<string, unknown>[];

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            pendingRef.current = null;
            saveToServer(chatId, transcriptId, elements as Record<string, unknown>[]);
        }, SAVE_DEBOUNCE_MS);
    }, [chatId, transcriptId]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Excalidraw
                excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
                onChange={(elements: readonly Record<string, unknown>[]) => handleChange(elements)}
                theme="light"
            />
        </div>
    );
}
