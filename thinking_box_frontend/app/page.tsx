"use client";

import { useAudioStream, DiarizationMode, TranscriptEntry } from '@/hooks/useAudioStream';
import { Mic, MicOff, Activity, AlertTriangle, CheckCircle, Users, Plus, Settings, FileText, X, Copy, BookOpen, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

// Agenda/Topic Summary type
type AgendaSummary = {
    topic: string;
    decisions: Array<{ value: string; status: string; timestamp: Date }>;
    turnbacks: Array<{ oldValue: string; newValue: string; reason: string; timestamp: Date }>;
    lastUpdated: Date;
};

export default function Home() {
    const meetingId = "test-meeting-1";
    const {
        isConnected,
        transcripts,
        analysisLogs,
        startRecording,
        stopRecording,
        diarizationMode,
        setDiarizationMode,
        speakers,
        currentSpeaker,
        switchSpeaker,
        addSpeaker,
    } = useAudioStream(meetingId);

    const [showSettings, setShowSettings] = useState(false);
    const [meetingStartTime, setMeetingStartTime] = useState<Date | null>(null);

    // Compute cumulative agenda summaries from analysisLogs
    const agendaSummaries = useMemo(() => {
        const summaryMap = new Map<string, AgendaSummary>();

        analysisLogs.forEach((log, index) => {
            // Process decisions
            log.decisions?.forEach(dec => {
                const topic = dec.topic || '기타';
                if (!summaryMap.has(topic)) {
                    summaryMap.set(topic, {
                        topic,
                        decisions: [],
                        turnbacks: [],
                        lastUpdated: new Date(),
                    });
                }
                const summary = summaryMap.get(topic)!;
                // Avoid duplicates
                if (!summary.decisions.find(d => d.value === dec.value)) {
                    summary.decisions.push({
                        value: dec.value,
                        status: dec.status,
                        timestamp: new Date(),
                    });
                    summary.lastUpdated = new Date();
                }
            });

            // Process turnbacks
            if (log.turnback) {
                const topic = log.turnback.target_topic || '기타';
                if (!summaryMap.has(topic)) {
                    summaryMap.set(topic, {
                        topic,
                        decisions: [],
                        turnbacks: [],
                        lastUpdated: new Date(),
                    });
                }
                const summary = summaryMap.get(topic)!;
                summary.turnbacks.push({
                    oldValue: log.turnback.target_topic,
                    newValue: log.turnback.new_value,
                    reason: log.turnback.reason,
                    timestamp: new Date(),
                });
                summary.lastUpdated = new Date();
            }
        });

        return Array.from(summaryMap.values()).sort((a, b) =>
            b.lastUpdated.getTime() - a.lastUpdated.getTime()
        );
    }, [analysisLogs]);

    // Handle meeting start
    const handleStartMeeting = () => {
        setMeetingStartTime(new Date());
        startRecording();
    };

    // Copy summary to clipboard
    const copySummaryToClipboard = () => {
        let text = `📋 실시간 회의 요약\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        agendaSummaries.forEach((agenda, i) => {
            text += `📌 ${agenda.topic}\n`;
            agenda.decisions.forEach(d => {
                text += `  ✓ ${d.value}\n`;
            });
            agenda.turnbacks.forEach(t => {
                text += `  ⚠️ 변경: ${t.oldValue} → ${t.newValue}\n`;
            });
            text += `\n`;
        });

        navigator.clipboard.writeText(text);
        alert('요약이 클립보드에 복사되었습니다!');
    };

    // Get meeting duration
    const getMeetingDuration = () => {
        if (!meetingStartTime) return '--:--';
        const now = new Date();
        const diffMs = now.getTime() - meetingStartTime.getTime();
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Update duration every second
    const [duration, setDuration] = useState('--:--');
    useEffect(() => {
        if (!isConnected || !meetingStartTime) return;
        const interval = setInterval(() => {
            setDuration(getMeetingDuration());
        }, 1000);
        return () => clearInterval(interval);
    }, [isConnected, meetingStartTime]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Thinking Box AI
                    </h1>
                    {isConnected && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg text-sm">
                            <span className="text-gray-400">⏱️</span>
                            <span className="font-mono text-blue-300">{duration}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5 text-gray-400" />
                    </button>
                    {agendaSummaries.length > 0 && (
                        <button
                            onClick={copySummaryToClipboard}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Copy className="w-4 h-4" /> 요약 복사
                        </button>
                    )}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isConnected ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        {isConnected ? 'Recording' : 'Ready'}
                    </div>
                </div>
            </header>

            {/* Settings Panel */}
            {showSettings && (
                <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3">화자 구분 모드</h3>
                    <div className="flex gap-2">
                        {(['manual', 'ai', 'off'] as DiarizationMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setDiarizationMode(mode)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${diarizationMode === mode
                                        ? mode === 'ai' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {mode === 'manual' ? '수동' : mode === 'ai' ? 'AI 자동' : '끄기'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Speaker Selection Bar */}
            {isConnected && diarizationMode === 'manual' && (
                <div className="mb-4 p-3 bg-gray-800 rounded-xl border border-gray-700 flex items-center gap-3 flex-wrap">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">화자:</span>
                    {speakers.map((speaker) => (
                        <button
                            key={speaker.id}
                            onClick={() => switchSpeaker(speaker.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${currentSpeaker?.id === speaker.id ? 'ring-2 ring-white scale-105' : 'opacity-60 hover:opacity-100'
                                }`}
                            style={{ backgroundColor: speaker.color, color: 'white' }}
                        >
                            {speaker.name}
                        </button>
                    ))}
                    <button
                        onClick={() => addSpeaker()}
                        className="p-1 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Controls */}
            <div className="flex justify-center mb-4">
                {!isConnected ? (
                    <button
                        onClick={handleStartMeeting}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
                    >
                        <Mic className="w-5 h-5" /> 회의 시작
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
                    >
                        <MicOff className="w-5 h-5" /> 회의 종료
                    </button>
                )}
            </div>

            {/* 3-Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)] min-h-[400px]">

                {/* Panel 1: Live Transcript */}
                <section className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col">
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
                        <Activity className="w-4 h-4 text-blue-400" /> 실시간 자막
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-sm">
                        {transcripts.length === 0 && (
                            <p className="text-gray-500 italic text-center mt-8 text-xs">대기 중...</p>
                        )}
                        {transcripts.map((entry, i) => (
                            <div
                                key={i}
                                className={`p-2 rounded-lg ${entry.isInterim ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-700/50 text-gray-200'}`}
                                style={{
                                    borderLeft: entry.speaker && diarizationMode !== 'off'
                                        ? `3px solid ${entry.speaker.color}`
                                        : '3px solid transparent'
                                }}
                            >
                                {entry.speaker && diarizationMode !== 'off' && (
                                    <span
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-1"
                                        style={{ backgroundColor: entry.speaker.color, color: 'white' }}
                                    >
                                        {entry.speaker.name}
                                    </span>
                                )}
                                {entry.isInterim && <span className="mr-1">🎤</span>}
                                {entry.text}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Panel 2: Instant Decisions & Turnbacks */}
                <section className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col">
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
                        <TrendingUp className="w-4 h-4 text-amber-400" /> 즉시 감지
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {analysisLogs.length === 0 && (
                            <p className="text-gray-500 italic text-center mt-8 text-xs">AI 분석 대기 중...</p>
                        )}

                        {analysisLogs.slice(-5).reverse().map((log, i) => (
                            <div key={i} className="space-y-2">
                                {/* Turnback Alert */}
                                {log.turnback && (
                                    <div className="bg-red-900/40 border border-red-500/50 p-3 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-red-300">⚠️ 변경 감지!</p>
                                                <p className="text-xs text-red-200 mt-0.5">
                                                    {log.turnback.target_topic} → <span className="font-mono bg-red-900/50 px-1 rounded">{log.turnback.new_value}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Decisions */}
                                {log.decisions?.map((dec, j) => (
                                    <div key={j} className="bg-green-900/30 border border-green-500/30 p-3 rounded-lg">
                                        <p className="text-[10px] text-green-400 font-medium">{dec.topic}</p>
                                        <p className="text-sm text-white font-medium">{dec.value}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Panel 3: Cumulative Meeting Summary */}
                <section className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col">
                    <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-300">
                        <BookOpen className="w-4 h-4 text-green-400" /> 회의 진행 요약
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {agendaSummaries.length === 0 && (
                            <p className="text-gray-500 italic text-center mt-8 text-xs">주제별로 정리됩니다...</p>
                        )}

                        {agendaSummaries.map((agenda, i) => (
                            <div key={i} className="bg-gray-700/40 rounded-lg p-3 border border-gray-600">
                                {/* Topic Header */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <h3 className="font-semibold text-white text-sm">{agenda.topic}</h3>
                                </div>

                                {/* Decisions in this topic */}
                                <div className="space-y-1 ml-8">
                                    {agenda.decisions.map((d, j) => (
                                        <div key={j} className="flex items-start gap-2 text-xs">
                                            <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                                            <span className="text-gray-200">{d.value}</span>
                                        </div>
                                    ))}

                                    {/* Turnbacks in this topic */}
                                    {agenda.turnbacks.map((t, j) => (
                                        <div key={`t-${j}`} className="flex items-start gap-2 text-xs">
                                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                                            <span className="text-amber-200">
                                                <span className="line-through opacity-50">{t.oldValue}</span>
                                                {' → '}
                                                <span className="font-medium">{t.newValue}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
