import socket

UDP_IP = "127.0.0.1"  # localhost
UDP_PORT = 5004

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

while True:
    # Get message from user
    message = input("Enter message to send (or 'quit' to exit): ")
    
    if message.lower() == 'quit':
        break
        
    # Send the message
    sock.sendto(message.encode(), (UDP_IP, UDP_PORT))
    
    # Wait for response
    response, addr = sock.recvfrom(1024)
    print(f"Received response: {response.decode()}")

sock.close() 