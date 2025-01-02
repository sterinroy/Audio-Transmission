import socket
import pyaudio
import time

# Configuration
IP = '127.0.0.1'  # Receiver IP
PORT = 5004       # Receiver Port
CHUNK = 160       # Packet size
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 8000

# Initialize audio capture
audio = pyaudio.PyAudio()
stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

# Initialize socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("Recording and transmitting...")
try:
    while True:
        data = stream.read(CHUNK)
        sock.sendto(data, (IP, PORT))
        time.sleep(0.02)  # Send 50 packets per second
except KeyboardInterrupt:
    print("Transmission stopped.")
    stream.stop_stream()
    stream.close()
    audio.terminate()
    sock.close()
