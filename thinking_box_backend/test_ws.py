import asyncio
import websockets

async def test_connection():
    uri = "ws://localhost:8000/ws/audio/test-meeting-123"
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket")
        await websocket.send("Hello Thinking Box!")
        response = await websocket.recv()
        print(f"Received from server: {response}")

if __name__ == "__main__":
    asyncio.run(test_connection())
