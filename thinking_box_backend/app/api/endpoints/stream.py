from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json

router = APIRouter()

from app.services.meaning_filter import meaning_filter

@router.websocket("/ws/text/{meeting_id}")
async def websocket_text_endpoint(websocket: WebSocket, meeting_id: str):
    """
    Handles real-time stream:
    1. Text from Web Speech API (Frontend)
    2. Audio chunks for Speaker Identification (Frontend)
    """
    await websocket.accept()
    print(f"Client connected to meeting: {meeting_id}")
    
    # Simple in-memory context
    active_topics = []
    
    # Session state
    current_speaker_id = None
    current_speaker_name = None
    
    # Import voice encoder service
    from app.services.voice_encoder import voice_encoder

    try:
        while True:
            # Receive message (can be text or binary)
            message = await websocket.receive()
            
            if "text" in message:
                # 1. Text Transcript (from Web Speech API)
                raw_message = message["text"]
                try:
                    data = json.loads(raw_message)
                except json.JSONDecodeError:
                    continue
                
                if data.get("type") == "TEXT":
                    transcript = data.get("text", "")
                    
                    if transcript and len(transcript.strip()) > 0:
                        print(f"Received transcript: {transcript} (Speaker: {current_speaker_name})")
                        
                        # Analyze with Meaning Filter
                        analysis_result = await meaning_filter.analyze_text(transcript, active_topics)
                        
                        # Update active topics
                        if analysis_result.main_topics:
                            active_topics = list(set(active_topics + analysis_result.main_topics))

                        # Send analysis result back to client
                        response = {
                            "type": "ANALYSIS",
                            "transcript": transcript,
                            "data": analysis_result.dict(),
                            # Include currently identified speaker info
                            "speaker": {
                                "id": current_speaker_id,
                                "name": current_speaker_name
                            } if current_speaker_id else None
                        }
                        await websocket.send_json(response)
            
            elif "bytes" in message:
                # 2. Audio Chunk (for Speaker Identification)
                audio_bytes = message["bytes"]
                
                # Check backend readiness
                if not voice_encoder.is_available():
                    continue
                    
                # Identify speaker
                # Use a higher threshold to avoid false positives on short noise
                result = voice_encoder.identify_speaker(audio_bytes, threshold=0.45)
                
                if result:
                    speaker_id, speaker_name, score = result
                    
                    # Only update if different or confidence is high
                    if speaker_id != current_speaker_id:
                        print(f"Speaker identified: {speaker_name} ({score:.2f})")
                        current_speaker_id = speaker_id
                        current_speaker_name = speaker_name
                        
                        # Notify client of speaker change immediately
                        await websocket.send_json({
                            "type": "SPEAKER_IDENTIFIED",
                            "speaker": {
                                "id": speaker_id,
                                "name": speaker_name,
                                "score": score
                            }
                        })
                
    except WebSocketDisconnect:
        print(f"Client disconnected from meeting: {meeting_id}")
    except Exception as e:
        print(f"Error in websocket connection: {e}")
