let audioChunks = [];
let receivedChunks = [];
let mediaRecorder;
let jitterData = [];
let packetLossData = [];
let jitterChart;
let packetLossChart;
let recordingInterval;

// Modify the simulateNetworkTransmission function
let accumulatedJitter = 0;
let accumulatedPacketLoss = 0;
let sampleCount = 0;
const UPDATE_INTERVAL = 1000; // 2 seconds
let lastUpdateTime = Date.now();

// Add audio quality metrics
let audioQualityData = [];

function evaluateAudioQuality(originalChunk, receivedChunk) {
    // Simple audio quality metric based on packet integrity
    const qualityScore = receivedChunk ? 
        (receivedChunk.size / originalChunk.size) * 100 : 0;
    
    audioQualityData.push(qualityScore);
    
    // Update audio quality display
    const averageQuality = audioQualityData.reduce((a, b) => a + b, 0) / audioQualityData.length;
    document.getElementById('audioQuality').innerText = 
        `${averageQuality.toFixed(1)}%`;
}

function simulateNetworkTransmission(chunk) {
    // Simulate jitter (0-50ms delay)
    const jitter = Math.random() * 50;
    // Simulate packet loss (0-5%)
    const packetLoss = Math.random() * 5;
    
    // Accumulate metrics
    accumulatedJitter += jitter;
    accumulatedPacketLoss += packetLoss;
    sampleCount++;
    
    // Simulate packet loss and evaluate quality
    if (Math.random() * 100 > packetLoss) {
        // Delayed delivery of the packet
        setTimeout(() => {
            receivedChunks.push(chunk);
            evaluateAudioQuality(chunk, chunk);
        }, jitter);
    } else {
        // Packet lost
        evaluateAudioQuality(chunk, null);
    }
    
    // Update charts every UPDATE_INTERVAL milliseconds
    const currentTime = Date.now();
    if (currentTime - lastUpdateTime >= UPDATE_INTERVAL) {
        updateMetrics();
    }
}

function updateMetrics() {
    // Calculate averages
    const averageJitter = accumulatedJitter / sampleCount;
    const averagePacketLoss = accumulatedPacketLoss / sampleCount;
    
    // Update charts with averaged data
    jitterData.push(averageJitter);
    packetLossData.push(averagePacketLoss);
    updateCharts();
    
    // Reset accumulators
    accumulatedJitter = 0;
    accumulatedPacketLoss = 0;
    sampleCount = 0;
    lastUpdateTime = Date.now();
}

function updateCharts() {
    if (jitterChart && packetLossChart) {
        // Limit the number of points shown on the graph
        const maxDataPoints = 30; // Show last 1 minute of data (30 * 2 seconds)
        
        if (jitterData.length > maxDataPoints) {
            jitterData.shift();
        }
        if (packetLossData.length > maxDataPoints) {
            packetLossData.shift();
        }

        // Update jitter chart
        jitterChart.data.labels = Array.from({ length: jitterData.length }, (_, i) => i + 1);
        jitterChart.data.datasets[0].data = jitterData;
        jitterChart.update('none'); // Use 'none' mode for better performance

        // Update packet loss chart
        packetLossChart.data.labels = Array.from({ length: packetLossData.length }, (_, i) => i + 1);
        packetLossChart.data.datasets[0].data = packetLossData;
        packetLossChart.update('none'); // Use 'none' mode for better performance

        // Update metrics display
        document.getElementById('jitter').innerText = 
            jitterData[jitterData.length - 1].toFixed(2) + ' ms';
        document.getElementById('packetLoss').innerText = 
            packetLossData[packetLossData.length - 1].toFixed(2) + '%';
    }
}

document.getElementById('startRecording').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        // Reset arrays
        audioChunks = [];
        receivedChunks = [];
        jitterData = [];
        packetLossData = [];
        
        // Handle original recording
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
            // Simulate network transmission for each chunk
            simulateNetworkTransmission(event.data);
        };

        mediaRecorder.start(100); // Record in 100ms chunks
        initializeGraphs();

        document.getElementById('startRecording').disabled = true;
        document.getElementById('stopRecording').disabled = false;
    } catch (e) {
        console.error('Error starting recording:', e);
    }
});

document.getElementById('stopRecording').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }

    mediaRecorder.onstop = () => {
        // Create original audio blob
        const originalBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const originalUrl = URL.createObjectURL(originalBlob);
        document.getElementById('originalAudio').src = originalUrl;

        // Create received audio blob
        const receivedBlob = new Blob(receivedChunks, { type: 'audio/webm' });
        const receivedUrl = URL.createObjectURL(receivedBlob);
        document.getElementById('receivedAudio').src = receivedUrl;
    };

    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
});

function initializeGraphs() {
    // Clear existing charts
    if (jitterChart) jitterChart.destroy();
    if (packetLossChart) packetLossChart.destroy();

    const ctxJitter = document.getElementById('jitterGraph').getContext('2d');
    jitterChart = new Chart(ctxJitter, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Jitter (ms)',
                data: jitterData,
                borderColor: 'blue',
                fill: false,
            }],
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 50
                }
            }
        }
    });

    const ctxPacketLoss = document.getElementById('packetLossGraph').getContext('2d');
    packetLossChart = new Chart(ctxPacketLoss, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Packet Loss (%)',
                data: packetLossData,
                borderColor: 'red',
                fill: false,
            }],
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

// This would be a better implementation using WebRTC's RTP
async function setupRTPConnection() {
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Get real RTP stats
    setInterval(async () => {
        const stats = await peerConnection.getStats();
        stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
                const jitter = report.jitter * 1000; // Convert to ms
                const packetsLost = report.packetsLost;
                const packetsTotal = report.packetsReceived + report.packetsLost;
                const lossRate = (packetsLost / packetsTotal) * 100;
                
                // Update metrics with real data
                updateMetrics(jitter, lossRate);
            }
        });
    }, UPDATE_INTERVAL);
}

function calculateMOS(jitter, packetLoss) {
    // Mean Opinion Score calculation (simplified)
    const R = 93.2 - (jitter * 0.24) - (packetLoss * 2.5);
    const MOS = 1 + (0.035 * R) + (R * (R - 60) * (100 - R) * 7e-6);
    return Math.min(Math.max(1, MOS), 5);
}
