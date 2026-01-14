"""
Speaker Enrollment and Identification API
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import base64

from app.services.voice_encoder import voice_encoder

router = APIRouter(prefix="/api/speakers", tags=["Speakers"])


@router.get("/status")
async def get_status():
    """Check if voice encoder is available."""
    return {
        "available": voice_encoder.is_available(),
        "enrolled_count": len(voice_encoder.enrolled_speakers)
    }


@router.get("/")
async def list_speakers():
    """List all enrolled speakers."""
    return {
        "speakers": voice_encoder.get_enrolled_speakers()
    }


@router.post("/enroll")
async def enroll_speaker(
    speaker_id: str = Form(...),
    speaker_name: str = Form(...),
    audio: UploadFile = File(...)
):
    """
    Enroll a new speaker with voice sample.
    
    - **speaker_id**: Unique ID for the speaker (e.g., "1", "2")
    - **speaker_name**: Display name (e.g., "화자 1")
    - **audio**: WAV audio file (16kHz recommended)
    """
    if not voice_encoder.is_available():
        raise HTTPException(status_code=503, detail="Voice encoder not available")
    
    audio_bytes = await audio.read()
    
    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too short")
    
    success = voice_encoder.enroll_speaker(speaker_id, speaker_name, audio_bytes)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to enroll speaker")
    
    return {
        "success": True,
        "speaker_id": speaker_id,
        "speaker_name": speaker_name,
        "message": f"Speaker '{speaker_name}' enrolled successfully"
    }


@router.post("/enroll-base64")
async def enroll_speaker_base64(
    speaker_id: str,
    speaker_name: str,
    audio_base64: str
):
    """
    Enroll a new speaker with base64-encoded audio.
    
    - **speaker_id**: Unique ID for the speaker
    - **speaker_name**: Display name
    - **audio_base64**: Base64-encoded WAV audio
    """
    if not voice_encoder.is_available():
        raise HTTPException(status_code=503, detail="Voice encoder not available")
    
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    
    if len(audio_bytes) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too short")
    
    success = voice_encoder.enroll_speaker(speaker_id, speaker_name, audio_bytes)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to enroll speaker")
    
    return {
        "success": True,
        "speaker_id": speaker_id,
        "speaker_name": speaker_name,
        "message": f"Speaker '{speaker_name}' enrolled successfully"
    }


@router.post("/identify")
async def identify_speaker(
    audio: UploadFile = File(...),
    threshold: float = Form(default=0.5)
):
    """
    Identify the speaker from audio.
    
    - **audio**: WAV audio file
    - **threshold**: Minimum similarity score (0-1, default 0.5)
    """
    if not voice_encoder.is_available():
        raise HTTPException(status_code=503, detail="Voice encoder not available")
    
    if not voice_encoder.enrolled_speakers:
        raise HTTPException(status_code=400, detail="No speakers enrolled")
    
    audio_bytes = await audio.read()
    
    result = voice_encoder.identify_speaker(audio_bytes, threshold)
    
    if result is None:
        return {
            "identified": False,
            "message": "No matching speaker found"
        }
    
    speaker_id, speaker_name, confidence = result
    return {
        "identified": True,
        "speaker_id": speaker_id,
        "speaker_name": speaker_name,
        "confidence": round(confidence, 3)
    }


@router.post("/identify-base64")
async def identify_speaker_base64(
    audio_base64: str,
    threshold: float = 0.5
):
    """
    Identify speaker from base64-encoded audio.
    """
    if not voice_encoder.is_available():
        raise HTTPException(status_code=503, detail="Voice encoder not available")
    
    if not voice_encoder.enrolled_speakers:
        raise HTTPException(status_code=400, detail="No speakers enrolled")
    
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    
    result = voice_encoder.identify_speaker(audio_bytes, threshold)
    
    if result is None:
        return {
            "identified": False,
            "message": "No matching speaker found"
        }
    
    speaker_id, speaker_name, confidence = result
    return {
        "identified": True,
        "speaker_id": speaker_id,
        "speaker_name": speaker_name,
        "confidence": round(confidence, 3)
    }


@router.delete("/{speaker_id}")
async def remove_speaker(speaker_id: str):
    """Remove an enrolled speaker."""
    success = voice_encoder.remove_speaker(speaker_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    return {
        "success": True,
        "message": f"Speaker {speaker_id} removed"
    }


@router.delete("/")
async def clear_all_speakers():
    """Clear all enrolled speakers."""
    voice_encoder.clear_all()
    return {
        "success": True,
        "message": "All speakers cleared"
    }
