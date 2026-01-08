"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

// Speaker and transcript types
export type Speaker = {
    id: string;
    name: string;
    color: string;
};

export type TranscriptEntry = {
    text: string;
    speaker: Speaker | null;
    timestamp: Date;
    isInterim: boolean;
};

type AnalysisResult = {
    main_topics: string[];
    decisions: Array<{ topic: string; value: string; status: string }>;
    turnback: { type: string; target_topic: string; new_value: string; reason: string } | null;
    is_chitchat: boolean;
};

type StreamMessage =
    | { type: 'ANALYSIS'; transcript: string; data: AnalysisResult }
    | { type: 'LOG'; message: string };

// Diarization modes
export type DiarizationMode = 'manual' | 'ai' | 'off';

// Predefined speaker colors
const SPEAKER_COLORS = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
];

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export function useAudioStream(meetingId: string) {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [analysisLogs, setAnalysisLogs] = useState<AnalysisResult[]>([]);

    // Speaker diarization state
    const [diarizationMode, setDiarizationMode] = useState<DiarizationMode>('manual');
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: '1', name: '화자 1', color: SPEAKER_COLORS[0] },
        { id: '2', name: '화자 2', color: SPEAKER_COLORS[1] },
    ]);
    const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);

    const socketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);

    // Add a new speaker
    const addSpeaker = useCallback((name?: string) => {
        const newId = String(speakers.length + 1);
        const newSpeaker: Speaker = {
            id: newId,
            name: name || `화자 ${newId}`,
            color: SPEAKER_COLORS[speakers.length % SPEAKER_COLORS.length],
        };
        setSpeakers(prev => [...prev, newSpeaker]);
        return newSpeaker;
    }, [speakers]);

    // Switch current speaker (for manual mode)
    const switchSpeaker = useCallback((speakerId: string) => {
        const speaker = speakers.find(s => s.id === speakerId);
        if (speaker) {
            setCurrentSpeaker(speaker);
        }
    }, [speakers]);

    // Initialize WebSocket connection
    const connectWebSocket = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = `ws://localhost:8000/ws/text/${meetingId}`;
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const data: StreamMessage = JSON.parse(event.data);
                if (data.type === 'ANALYSIS') {
                    console.log('Analysis Received:', data.data);
                    setAnalysisLogs(prev => [...prev, data.data]);
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        socket.onclose = () => {
            setIsConnected(false);
            socketRef.current = null;
        };

        socketRef.current = socket;
    }, [meetingId]);

    // Initialize Web Speech API
    const initSpeechRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Web Speech API is not supported in this browser');
            return null;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                } else {
                    interimTranscript += result[0].transcript;
                }
            }

            // Show interim results immediately
            if (interimTranscript) {
                setTranscripts(prev => {
                    const newTranscripts = [...prev];
                    const lastIdx = newTranscripts.length - 1;

                    if (lastIdx >= 0 && newTranscripts[lastIdx].isInterim) {
                        newTranscripts[lastIdx] = {
                            text: interimTranscript,
                            speaker: currentSpeaker,
                            timestamp: new Date(),
                            isInterim: true,
                        };
                    } else {
                        newTranscripts.push({
                            text: interimTranscript,
                            speaker: currentSpeaker,
                            timestamp: new Date(),
                            isInterim: true,
                        });
                    }
                    return newTranscripts;
                });
            }

            if (finalTranscript && finalTranscript.trim().length > 0) {
                console.log('Final transcript:', finalTranscript);

                // Replace interim with final
                setTranscripts(prev => {
                    const filtered = prev.filter(t => !t.isInterim);
                    return [...filtered, {
                        text: finalTranscript,
                        speaker: currentSpeaker,
                        timestamp: new Date(),
                        isInterim: false,
                    }];
                });

                // Send to backend for analysis (include speaker info)
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        type: 'TEXT',
                        text: finalTranscript,
                        speaker: currentSpeaker ? { id: currentSpeaker.id, name: currentSpeaker.name } : null,
                    }));
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            if (isListening && recognitionRef.current) {
                recognition.start();
            }
        };

        return recognition;
    }, [isListening, currentSpeaker]);

    const startRecording = useCallback(() => {
        connectWebSocket();

        // Set default speaker if in manual mode
        if (diarizationMode === 'manual' && !currentSpeaker && speakers.length > 0) {
            setCurrentSpeaker(speakers[0]);
        }

        if (!recognitionRef.current) {
            recognitionRef.current = initSpeechRecognition();
        }

        if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [connectWebSocket, initSpeechRecognition, diarizationMode, currentSpeaker, speakers]);

    const stopRecording = useCallback(() => {
        setIsListening(false);

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        if (socketRef.current) {
            socketRef.current.close();
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        isConnected: isConnected || isListening,
        transcripts,
        analysisLogs,
        startRecording,
        stopRecording,
        // Speaker diarization
        diarizationMode,
        setDiarizationMode,
        speakers,
        currentSpeaker,
        switchSpeaker,
        addSpeaker,
    };
}
