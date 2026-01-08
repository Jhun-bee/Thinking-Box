from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="Thinking Box Backend",
    description="Real-time meeting assistant backend with Turnback detection",
    version="0.1.0"
)

# Configure CORS (Allow all for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
from app.api.endpoints import stream
app.include_router(stream.router)

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Thinking Box Backend is running"}

if __name__ == "__main__":
    # Run the server with auto-reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
