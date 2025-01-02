import matplotlib.pyplot as plt
import csv

# Read data from the log file
time_stamps = []
jitter_values = []
packet_loss = []

with open("metrics.log", "r") as log_file:
    csv_reader = csv.reader(log_file)
    next(csv_reader)  # Skip header
    for row in csv_reader:
        time_stamps.append(float(row[0]))
        jitter_values.append(float(row[1]))
        packet_loss.append(int(row[2]))

# Plot Jitter
plt.figure()
plt.plot(time_stamps, jitter_values, label="Jitter (ms)")
plt.xlabel("Time (s)")
plt.ylabel("Jitter (ms)")
plt.title("Jitter over Time")
plt.legend()

# Plot Packet Loss
plt.figure()
plt.plot(time_stamps, packet_loss, label="Packet Loss", color='r')
plt.xlabel("Time (s)")
plt.ylabel("Lost Packets")
plt.title("Packet Loss over Time")
plt.legend()

plt.show()
