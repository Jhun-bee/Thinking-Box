from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json

router = APIRouter()

from app.services.meaning_filter import meaning_filter

@router.websocket("/ws/text/{meeting_id}")
async def websocket_text_endpoint(websocket: WebSocket, meeting_id: str):
    """
    Handles real-time TEXT streaming from the client (using Web Speech API on frontend).
    No STT needed - the browser does it!
    """
    await websocket.accept()
    print(f"Client connected to meeting: {meeting_id}")
    
    # Simple in-memory context
    active_topics = []

    try:
        while True:
            # Receive text message from client
            raw_message = await websocket.receive_text()
            message = json.loads(raw_message)
            
            if message.get("type") == "TEXT":
                transcript = message.get("text", "")
                
                if transcript and len(transcript.strip()) > 0:
                    print(f"Received transcript: {transcript}")
                    
                    # Analyze with Meaning Filter
                    analysis_result = await meaning_filter.analyze_text(transcript, active_topics)
                    
                    # Update active topics
                    if analysis_result.main_topics:
                        active_topics = list(set(active_topics + analysis_result.main_topics))

                    # Send analysis result back to client
                    await websocket.send_json({
                        "type": "ANALYSIS",
                        "transcript": transcript,
                        "data": analysis_result.dict()
                    })
                
    except WebSocketDisconnect:
        print(f"Client disconnected from meeting: {meeting_id}")
    except Exception as e:
        print(f"Error in websocket connection: {e}")
