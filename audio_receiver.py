import socket
import time

# Configuration
IP = '127.0.0.1'
PORT = 5004

# Initialize socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((IP, PORT))

# Variables for monitoring
expected_seq = 0
lost_packets = 0
jitter = 0
prev_transit = None
start_time = time.time()

# Open log file to save metrics
log_file = open("metrics.log", "w")
log_file.write("Time,Jitter,PacketLoss\n")  # CSV Header

print("Listening for RTP packets...")
try:
    while True:
        data, addr = sock.recvfrom(2048)
        seq_num = int.from_bytes(data[:2], 'big')  # Simulate sequence number (2 bytes)
        arrival_time = time.time()  # Arrival time of the packet

        # Calculate packet loss
        if seq_num != expected_seq:
            lost_packets += seq_num - expected_seq

        # Calculate jitter
        transit = arrival_time
        if prev_transit is not None:
            jitter += abs(transit - prev_transit) / 16
        prev_transit = transit

        expected_seq = seq_num + 1

        # Log metrics
        elapsed_time = arrival_time - start_time
        log_file.write(f"{elapsed_time:.2f},{jitter:.2f},{lost_packets}\n")

        print(f"Time: {elapsed_time:.2f}s, Jitter: {jitter:.2f} ms, Packet Loss: {lost_packets}")
except KeyboardInterrupt:
    print("Receiver stopped.")
    log_file.close()
    sock.close()
