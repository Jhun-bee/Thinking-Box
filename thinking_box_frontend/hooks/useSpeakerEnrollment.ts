"use client";

import { useState, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';

export type EnrollmentStatus = 'idle' | 'recording' | 'processing' | 'enrolled' | 'error';

export type EnrolledSpeaker = {
    id: string;
    name: string;
    status: EnrollmentStatus;
    confidence?: number;
};

export function useSpeakerEnrollment() {
    const [enrolledSpeakers, setEnrolledSpeakers] = useState<Map<string, EnrolledSpeaker>>(new Map());
    const [isRecording, setIsRecording] = useState(false);
    const [currentRecordingSpeaker, setCurrentRecordingSpeaker] = useState<string | null>(null);
    const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
    const [currentTranscript, setCurrentTranscript] = useState<string>('');
    const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map()); // speaker_id -> audio URL

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);

    // Check if speaker API is available
    const checkApiStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/speakers/status`);
            const data = await response.json();
            setIsApiAvailable(data.available);
            return data.available;
        } catch (error) {
            console.error('Failed to check API status:', error);
            setIsApiAvailable(false);
            return false;
        }
    }, []);

    // Start recording audio for a speaker
    const startRecording = useCallback(async (speakerId: string, speakerName: string) => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            streamRef.current = stream;

            // Create MediaRecorder (prefer WAV-compatible format)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Process the recorded audio
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                // Create audio URL for playback
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioUrls(prev => {
                    const newMap = new Map(prev);
                    newMap.set(speakerId, audioUrl);
                    return newMap;
                });

                await enrollSpeaker(speakerId, speakerName, audioBlob);

                // Stop the stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            // Update status
            setEnrolledSpeakers(prev => {
                const newMap = new Map(prev);
                newMap.set(speakerId, { id: speakerId, name: speakerName, status: 'recording' });
                return newMap;
            });

            setIsRecording(true);
            setCurrentRecordingSpeaker(speakerId);
            setCurrentTranscript('');
            mediaRecorder.start(100); // Collect data every 100ms

            // Start Web Speech API for real-time transcription
            try {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'ko-KR';

                    recognition.onresult = (event: any) => {
                        let transcript = '';
                        for (let i = 0; i < event.results.length; i++) {
                            transcript += event.results[i][0].transcript;
                        }
                        setCurrentTranscript(transcript);
                    };

                    recognition.start();
                    recognitionRef.current = recognition;
                }
            } catch (e) {
                console.log('Speech recognition not available');
            }

            console.log(`Started recording for ${speakerName}`);

        } catch (error) {
            console.error('Failed to start recording:', error);
            setEnrolledSpeakers(prev => {
                const newMap = new Map(prev);
                newMap.set(speakerId, { id: speakerId, name: speakerName, status: 'error' });
                return newMap;
            });
        }
    }, []);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setCurrentRecordingSpeaker(null);

            // Stop speech recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
                recognitionRef.current = null;
            }
        }
    }, [isRecording]);

    // Enroll speaker with audio
    const enrollSpeaker = useCallback(async (speakerId: string, speakerName: string, audioBlob: Blob) => {
        setEnrolledSpeakers(prev => {
            const newMap = new Map(prev);
            newMap.set(speakerId, { id: speakerId, name: speakerName, status: 'processing' });
            return newMap;
        });

        try {
            // Convert blob to base64
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            // For webm, we need to convert to WAV on the backend or send as file
            // Using FormData for file upload
            const formData = new FormData();
            formData.append('speaker_id', speakerId);
            formData.append('speaker_name', speakerName);
            formData.append('audio', audioBlob, `speaker_${speakerId}.webm`);

            const response = await fetch(`${API_BASE}/api/speakers/enroll`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setEnrolledSpeakers(prev => {
                    const newMap = new Map(prev);
                    newMap.set(speakerId, {
                        id: speakerId,
                        name: speakerName,
                        status: 'enrolled',
                        confidence: data.confidence
                    });
                    return newMap;
                });
                console.log(`Speaker ${speakerName} enrolled successfully`);
            } else {
                throw new Error('Enrollment failed');
            }
        } catch (error) {
            console.error('Failed to enroll speaker:', error);
            setEnrolledSpeakers(prev => {
                const newMap = new Map(prev);
                newMap.set(speakerId, { id: speakerId, name: speakerName, status: 'error' });
                return newMap;
            });
        }
    }, []);

    // Get enrollment status for a speaker
    const getEnrollmentStatus = useCallback((speakerId: string): EnrollmentStatus => {
        return enrolledSpeakers.get(speakerId)?.status || 'idle';
    }, [enrolledSpeakers]);

    // Clear all enrollments
    const clearEnrollments = useCallback(async () => {
        try {
            await fetch(`${API_BASE}/api/speakers/`, { method: 'DELETE' });
            setEnrolledSpeakers(new Map());
        } catch (error) {
            console.error('Failed to clear enrollments:', error);
        }
    }, []);

    // Get audio URL for playback
    const getAudioUrl = useCallback((speakerId: string): string | undefined => {
        return audioUrls.get(speakerId);
    }, [audioUrls]);

    return {
        isRecording,
        currentRecordingSpeaker,
        currentTranscript,
        isApiAvailable,
        enrolledSpeakers,
        audioUrls,
        checkApiStatus,
        startRecording,
        stopRecording,
        getEnrollmentStatus,
        getAudioUrl,
        clearEnrollments,
    };
}
