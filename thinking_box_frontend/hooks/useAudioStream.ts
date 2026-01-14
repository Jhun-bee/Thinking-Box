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
export type DiarizationMode = 'manual' | 'enroll' | 'ai-beta' | 'off';

// Predefined speaker colors
export const SPEAKER_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
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
    const [isPaused, setIsPaused] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [analysisLogs, setAnalysisLogs] = useState<AnalysisResult[]>([]);

    // New State for Audio Analysis & Streaming
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const currentVolumeRef = useRef<number>(-100);
    const isPausedRef = useRef(false);

    // Initialize Audio Context & Analyser for Hallucination Filter
    const initAudioAnalysis = useCallback((stream: MediaStream) => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContextClass();
            const source = context.createMediaStreamSource(stream);
            const analyserNode = context.createAnalyser();
            analyserNode.fftSize = 256;
            source.connect(analyserNode);

            setAudioContext(context);
            setAnalyser(analyserNode);

            // Continuously measure volume
            const pcmData = new Float32Array(analyserNode.fftSize);
            const checkVolume = () => {
                if (context.state === 'closed') return;

                analyserNode.getFloatTimeDomainData(pcmData);
                let sumSquares = 0.0;
                for (let i = 0; i < pcmData.length; i++) {
                    sumSquares += pcmData[i] * pcmData[i];
                }
                const rms = Math.sqrt(sumSquares / pcmData.length);
                // Convert to dB safely
                const db = rms > 0 ? 20 * Math.log10(rms) : -100;
                currentVolumeRef.current = db;

                requestAnimationFrame(checkVolume);
            };
            checkVolume();

        } catch (e) {
            console.error("Audio Context Init Failed:", e);
        }
    }, []);

    // Speaker diarization state
    const [diarizationMode, setDiarizationMode] = useState<DiarizationMode>('enroll');
    const [speakers, setSpeakers] = useState<Speaker[]>([
        { id: '1', name: '화자 1', color: SPEAKER_COLORS[0] },
        { id: '2', name: '화자 2', color: SPEAKER_COLORS[1] },
    ]);
    const [currentSpeaker, setCurrentSpeaker] = useState<Speaker | null>(null);

    // Use refs for values that need to be accessed in callbacks
    const socketRef = useRef<WebSocket | null>(null);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const currentSpeakerRef = useRef<Speaker | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // For AI mode: track last speech time to detect speaker changes
    const lastSpeechTimeRef = useRef<number>(Date.now());
    const speakerIndexRef = useRef<number>(0);
    const diarizationModeRef = useRef<DiarizationMode>('manual');
    const SPEAKER_CHANGE_THRESHOLD_MS = 3000; // 3 seconds of pause suggests speaker change

    // Sync currentSpeaker to ref
    useEffect(() => {
        currentSpeakerRef.current = currentSpeaker;
    }, [currentSpeaker]);

    // Sync isPaused to ref
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    // Sync diarizationMode to ref
    useEffect(() => {
        diarizationModeRef.current = diarizationMode;
    }, [diarizationMode]);

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

    // Initialize WebSocket connection with auto-reconnect
    const connectWebSocket = useCallback(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        const wsUrl = `ws://localhost:8000/ws/text/${meetingId}`;
        console.log('Connecting WebSocket to:', wsUrl);

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
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            socketRef.current = null;

            // Auto-reconnect if still listening
            if (isListeningRef.current) {
                console.log('Auto-reconnecting WebSocket in 1 second...');
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, 1000);
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socketRef.current = socket;
    }, [meetingId]);

    // Initialize Web Speech API with robust error handling and auto-restart
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
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const isLowVolume = currentVolumeRef.current < -50;

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

            // Hallucination Filter: 
            // Only ignore if we have NO final transcript AND volume is low.
            // This allows 'isFinal' events (which often happen during silence) to pass through.
            if (!finalTranscript && isLowVolume) {
                return;
            }

            // Determine speaker based on mode
            let speaker = currentSpeakerRef.current;

            // AI mode: auto-detect speaker change based on pause duration
            if (diarizationModeRef.current === 'ai-beta' && finalTranscript) {
                const now = Date.now();
                const pauseDuration = now - lastSpeechTimeRef.current;

                // If pause is greater than threshold, switch speaker
                if (pauseDuration > SPEAKER_CHANGE_THRESHOLD_MS) {
                    speakerIndexRef.current = (speakerIndexRef.current + 1) % speakers.length;
                    speaker = speakers[speakerIndexRef.current];
                    setCurrentSpeaker(speaker);
                    console.log(`AI detected speaker change (${pauseDuration}ms pause) -> ${speaker.name}`);
                }

                lastSpeechTimeRef.current = now;
            }

            // Show interim results immediately
            if (interimTranscript) {
                setTranscripts(prev => {
                    const newTranscripts = [...prev];
                    const lastIdx = newTranscripts.length - 1;

                    if (lastIdx >= 0 && newTranscripts[lastIdx].isInterim) {
                        newTranscripts[lastIdx] = {
                            text: interimTranscript,
                            speaker: speaker,
                            timestamp: new Date(),
                            isInterim: true,
                        };
                    } else {
                        newTranscripts.push({
                            text: interimTranscript,
                            speaker: speaker,
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
                        speaker: speaker,
                        timestamp: new Date(),
                        isInterim: false,
                    }];
                });

                // Send to backend for analysis
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({
                        type: 'TEXT',
                        text: finalTranscript,
                        speaker: speaker ? { id: speaker.id, name: speaker.name } : null,
                    }));
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);

            // Don't restart on aborted or no-speech (these are expected)
            if (event.error === 'aborted' || event.error === 'no-speech') {
                return;
            }

            // For other errors, try to restart
            if (isListeningRef.current) {
                console.log('Restarting recognition after error...');
                setTimeout(() => {
                    if (isListeningRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.error('Failed to restart:', e);
                        }
                    }
                }, 500);
            }
        };

        recognition.onend = () => {
            console.log('Recognition ended, isListening:', isListeningRef.current);

            // Auto-restart if still supposed to be listening
            if (isListeningRef.current) {
                console.log('Auto-restarting speech recognition...');
                setTimeout(() => {
                    if (isListeningRef.current && recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                            console.log('Recognition restarted successfully');
                        } catch (e) {
                            console.error('Failed to restart recognition:', e);
                        }
                    }
                }, 100);
            }
        };

        return recognition;
    }, [speakers]);

    // Handle visibility change (tab switch)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isListeningRef.current) {
                console.log('Tab became visible, checking connections...');

                // Restart recognition if needed
                if (recognitionRef.current) {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        // Already running, ignore
                    }
                }

                // Reconnect WebSocket if needed
                if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
                    connectWebSocket();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [connectWebSocket]);

    const startRecording = useCallback(async () => {
        console.log('Starting recording...');
        // setIsListening(true);  <-- Removed undefined call
        setIsConnected(true);
        setIsPaused(false);
        isPausedRef.current = false;
        isListeningRef.current = true;

        connectWebSocket();

        // Set default speaker if in manual mode
        if (diarizationMode === 'manual' && !currentSpeaker && speakers.length > 0) {
            setCurrentSpeaker(speakers[0]);
        }

        // 1. Start Web Speech API
        if (!recognitionRef.current) {
            recognitionRef.current = initSpeechRecognition();
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                console.log('Recognition started');
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }

        // 2. Start Audio Streaming for Speaker ID & Hallucination Filter
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Init volume analysis (Continuous)
            initAudioAnalysis(stream);

            // Speaker ID: Record short chunks periodically to get valid headers
            // using a recursive function to loop
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            setMediaRecorder(mediaRecorder);

            const recordChunk = () => {
                if (!isListeningRef.current) return;

                if (mediaRecorder.state === 'inactive') {
                    mediaRecorder.start();

                    // Stop after 1.5 seconds to create a valid file
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, 1500);
                }
            };

            mediaRecorder.ondataavailable = async (e) => {
                if (e.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN && !isPausedRef.current) {
                    const buffer = await e.data.arrayBuffer();
                    socketRef.current.send(buffer);
                }
            };

            mediaRecorder.onstop = () => {
                // Schedule next chunk immediately
                if (isListeningRef.current) {
                    // small delay to prevent CPU loop if something goes wrong, but essentially continuous
                    setTimeout(recordChunk, 200);
                }
            };

            // Start the loop
            recordChunk();

        } catch (err) {
            console.error("Mic access failed for streaming:", err);
        }
    }, [connectWebSocket, initSpeechRecognition, diarizationMode, currentSpeaker, speakers, initAudioAnalysis]);

    const stopRecording = useCallback(() => {
        console.log('Stopping recording...');
        isListeningRef.current = false;

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Stop Web Speech API
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore stop errors
            }
        }

        // Stop MediaRecorder & AudioContext
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            try {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            } catch (e) { console.error(e); }
        }

        if (audioContext && audioContext.state !== 'closed') {
            try {
                audioContext.close();
            } catch (e) { console.error(e); }
        }

        setMediaRecorder(null);
        setAudioContext(null);

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        setIsConnected(false);
        setIsPaused(false);
    }, [mediaRecorder, audioContext]);

    // Pause recording (keep session, stop recognition)
    const pauseRecording = useCallback(() => {
        console.log('Pausing recording...');
        setIsPaused(true);

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { }
        }

        // Keep WebSocket alive but stop listening
        isListeningRef.current = false;
    }, []);

    // Resume recording
    const resumeRecording = useCallback(() => {
        console.log('Resuming recording...');
        setIsPaused(false);
        isListeningRef.current = true;

        // Reconnect WebSocket if needed
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        }

        // Restart recognition
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) { }
        }
    }, [connectWebSocket]);

    // Start a new meeting (clear data)
    const newMeeting = useCallback(() => {
        console.log('Starting new meeting...');

        // Stop current session
        isListeningRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        // Clear all data
        setTranscripts([]);
        setAnalysisLogs([]);
        setIsConnected(false);
        setIsPaused(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isListeningRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        isConnected: isConnected || isListeningRef.current,
        isPaused,
        transcripts,
        analysisLogs,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        newMeeting,
        // Speaker diarization
        diarizationMode,
        setDiarizationMode,
        speakers,
        setSpeakers,
        currentSpeaker,
        switchSpeaker,
        addSpeaker,
    };
}
