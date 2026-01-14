# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.0] - 2026-01-14

### 🚀 Features & Improvements
- **Real-time Speaker Identification**: Added backend support using `SpeechBrain` (ECAPA-TDNN) to identify speakers from audio streams.
- **Frontend Audio Streaming**: Implemented `MediaRecorder` to stream audio chunks to backend for identification.
- **Hallucination Filter**: Added volume-based filtering to reduce transcript hallucinations during silence (threshold: -50dB).
- **Frontend Layout Overhaul**: Fixed page layout to prevent infinite scrolling; implemented independent scrolling for Transcript, Logs, and Summary panels.
- **Windows Compatibility**: Added fixes for `symlink` issues and `FFmpeg` header parsing errors on Windows environment.
- **Transcript UI**: Improved real-time transcript display with speaker tags (`[화자 1]`) and color coding.

### 🐛 Bug Fixes
- Fixed `WinError 1314` (symlink permission) by forcing file copy for SpeechBrain models.
- Fixed `FFmpeg: EBML header parsing failed` by sending complete file chunks instead of raw streams.
- Fixed transcript display issue where text was not stacking correctly.
- Fixed `isFinal` event blocking bug in hallucination filter.

## [v0.0.1] - 2026-01-08
- Initial project setup.
- Basic real-time transcription using Web Speech API.
- Summary generation via LLM (Mock/Initial).
