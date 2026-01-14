"""
Voice Encoder Service for Speaker Diarization
Uses SpeechBrain ECAPA-TDNN model for voice embeddings
"""
# Set environment variables BEFORE importing speechbrain
import os
import shutil
import platform

# Monkey Patch: Replace symlink with copy on Windows to solve WinError 1314
if platform.system() == "Windows":
    def symlink_to_copy(src, dst, target_is_directory=False, dir_fd=None):
        if target_is_directory or os.path.isdir(src):
            if os.path.exists(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
        else:
            if os.path.exists(dst):
                os.remove(dst)
            shutil.copy2(src, dst)
    
    os.symlink = symlink_to_copy

# Set environment variables BEFORE importing speechbrain
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["SPEECHBRAIN_FETCH_STRATEGY"] = "copy"
os.environ["HF_HUB_LOCAL_DIR_USE_SYMLINKS"] = "False"

import torch
import torchaudio
import numpy as np
from typing import Dict, List, Optional, Tuple
import io
import base64

# SpeechBrain speaker embedding model
try:
    from speechbrain.inference.speaker import EncoderClassifier
    SPEECHBRAIN_AVAILABLE = True
except ImportError:
    SPEECHBRAIN_AVAILABLE = False
    print("Warning: SpeechBrain not available. Voice embedding disabled.")


class VoiceEncoder:
    """Voice embedding service for speaker identification."""
    
    def __init__(self):
        self.model = None
        self.enrolled_speakers: Dict[str, np.ndarray] = {}  # speaker_id -> embedding
        self.speaker_names: Dict[str, str] = {}  # speaker_id -> name
        
        # AI-beta mode: cluster embeddings
        self.unlabeled_embeddings: List[Tuple[np.ndarray, str]] = []  # (embedding, transcript_id)
        self.cluster_assignments: Dict[str, int] = {}  # transcript_id -> cluster_id
        
        self._load_model()
    
    def _load_model(self):
        """Load the SpeechBrain ECAPA-TDNN model."""
        if not SPEECHBRAIN_AVAILABLE:
            return
        
        try:
            print("Downloading Voice Encoder model... (this may take a while)")
            
            # 1. Manually download using huggingface_hub to force COPY (no symlinks)
            from huggingface_hub import snapshot_download
            
            model_dir = "pretrained_models/spkrec-ecapa-voxceleb"
            
            # Download model files ensuring no symlinks are used
            snapshot_download(
                repo_id="speechbrain/spkrec-ecapa-voxceleb",
                local_dir=model_dir,
                local_dir_use_symlinks=False,  # CRITICAL: Force copy on Windows
                ignore_patterns=["*.msgpack", "*.bin"] # optimized loading
            )
            
            # 2. Load model from local directory
            self.model = EncoderClassifier.from_hparams(
                source=model_dir, # Point to local dir
                savedir=model_dir,
                run_opts={"device": "cpu"}
            )
            print("Voice encoder model loaded successfully!")
        except Exception as e:
            print(f"Failed to load voice encoder: {e}")
            self.model = None
    
    def is_available(self) -> bool:
        """Check if the voice encoder is ready."""
        return self.model is not None
    
    def _preprocess_audio(self, audio_bytes: bytes, sample_rate: int = 16000) -> torch.Tensor:
        """
        Convert audio bytes to tensor.
        Uses ffmpeg to convert webm (browser) -> wav (torchaudio compatible).
        """
        import tempfile
        import os
        import subprocess
        
        input_tmp = None
        output_tmp = None
        
        try:
            # 1. Write input bytes to temp file
            # Browser usually sends webm/opus
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp_file:
                tmp_file.write(audio_bytes)
                input_tmp = tmp_file.name
            
            # 2. Output wav file path
            output_tmp = input_tmp.replace(".webm", ".wav")
            
            # 3. Use ffmpeg to convert and resample
            # -y: overwrite output
            # -vn: disable video
            # -ac 1: mono
            # -ar 16000: 16kHz sample rate
            command = [
                "ffmpeg", "-y", 
                "-v", "error", # quiet mode
                "-i", input_tmp, 
                "-ac", "1", 
                "-ar", str(sample_rate), 
                output_tmp
            ]
            
            # Run ffmpeg
            result = subprocess.run(command, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"FFmpeg conversion failed: {result.stderr}")
                return None
            
            # 4. Load converted WAV file
            waveform, sr = torchaudio.load(output_tmp)
            
            # Squeeze to (time, ) from (channel, time)
            return waveform.squeeze(0)
            
        except Exception as e:
            print(f"Audio preprocessing error: {e}")
            return None
            
        finally:
            # Cleanup temp files
            if input_tmp and os.path.exists(input_tmp):
                try:
                    os.remove(input_tmp)
                except:
                    pass
            if output_tmp and os.path.exists(output_tmp):
                try:
                    os.remove(output_tmp)
                except:
                    pass
    
    def extract_embedding(self, audio_bytes: bytes) -> Optional[np.ndarray]:
        """Extract voice embedding from audio bytes."""
        if not self.is_available():
            return None
        
        waveform = self._preprocess_audio(audio_bytes)
        if waveform is None:
            return None
        
        try:
            # Get embedding (256-dim for ECAPA-TDNN)
            with torch.no_grad():
                embedding = self.model.encode_batch(waveform.unsqueeze(0))
            return embedding.squeeze().numpy()
        except Exception as e:
            print(f"Embedding extraction error: {e}")
            return None
    
    def enroll_speaker(self, speaker_id: str, speaker_name: str, audio_bytes: bytes) -> bool:
        """
        Enroll a speaker with their voice sample.
        
        Args:
            speaker_id: Unique identifier for the speaker
            speaker_name: Display name for the speaker
            audio_bytes: Audio recording of the speaker (WAV format, 16kHz recommended)
        
        Returns:
            True if enrollment successful, False otherwise
        """
        embedding = self.extract_embedding(audio_bytes)
        if embedding is None:
            return False
        
        self.enrolled_speakers[speaker_id] = embedding
        self.speaker_names[speaker_id] = speaker_name
        print(f"Speaker enrolled: {speaker_name} (ID: {speaker_id})")
        return True
    
    def identify_speaker(self, audio_bytes: bytes, threshold: float = 0.5) -> Optional[Tuple[str, str, float]]:
        """
        Identify the speaker from audio.
        
        Args:
            audio_bytes: Audio recording to identify
            threshold: Minimum similarity score (0-1) to consider a match
        
        Returns:
            Tuple of (speaker_id, speaker_name, confidence) or None if no match
        """
        if not self.enrolled_speakers:
            return None
        
        embedding = self.extract_embedding(audio_bytes)
        if embedding is None:
            return None
        
        best_match = None
        best_score = -1
        
        for speaker_id, enrolled_embedding in self.enrolled_speakers.items():
            # Cosine similarity
            similarity = np.dot(embedding, enrolled_embedding) / (
                np.linalg.norm(embedding) * np.linalg.norm(enrolled_embedding)
            )
            
            if similarity > best_score:
                best_score = similarity
                best_match = speaker_id
        
        if best_match and best_score >= threshold:
            return (best_match, self.speaker_names[best_match], float(best_score))
        
        return None
    
    def get_enrolled_speakers(self) -> List[Dict]:
        """Get list of enrolled speakers."""
        return [
            {"id": sid, "name": self.speaker_names.get(sid, f"Speaker {sid}")}
            for sid in self.enrolled_speakers.keys()
        ]
    
    def remove_speaker(self, speaker_id: str) -> bool:
        """Remove an enrolled speaker."""
        if speaker_id in self.enrolled_speakers:
            del self.enrolled_speakers[speaker_id]
            del self.speaker_names[speaker_id]
            return True
        return False
    
    def clear_all(self):
        """Clear all enrolled speakers and clusters."""
        self.enrolled_speakers.clear()
        self.speaker_names.clear()
        self.unlabeled_embeddings.clear()
        self.cluster_assignments.clear()
    
    # AI-Beta Mode: Clustering
    def add_to_cluster(self, audio_bytes: bytes, transcript_id: str) -> Optional[int]:
        """
        Add audio to clustering (AI-beta mode).
        Returns the assigned cluster ID.
        """
        embedding = self.extract_embedding(audio_bytes)
        if embedding is None:
            return None
        
        # Simple clustering: find most similar existing cluster or create new
        if not self.unlabeled_embeddings:
            # First utterance, create cluster 0
            self.unlabeled_embeddings.append((embedding, transcript_id))
            self.cluster_assignments[transcript_id] = 0
            return 0
        
        # Find most similar existing embedding
        best_cluster = 0
        best_score = -1
        
        for existing_emb, _ in self.unlabeled_embeddings:
            similarity = np.dot(embedding, existing_emb) / (
                np.linalg.norm(embedding) * np.linalg.norm(existing_emb)
            )
            if similarity > best_score:
                best_score = similarity
                best_cluster = self.cluster_assignments.get(_, 0)
        
        # If similarity is low, create new cluster
        if best_score < 0.6:
            # Find max cluster ID and create new one
            max_cluster = max(self.cluster_assignments.values()) if self.cluster_assignments else -1
            best_cluster = max_cluster + 1
        
        self.unlabeled_embeddings.append((embedding, transcript_id))
        self.cluster_assignments[transcript_id] = best_cluster
        
        return best_cluster


# Singleton instance
voice_encoder = VoiceEncoder()
