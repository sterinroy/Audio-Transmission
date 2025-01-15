let audioChunks = [];
let receivedChunks = [];
let mediaRecorder;
let jitterData = [];
let packetLossData = [];
let jitterChart;
let packetLossChart;
let recordingInterval;
let audioQualityData = [];
let peerConnection;

// Constants for metrics
const UPDATE_INTERVAL = 2000; // 2 seconds
let accumulatedJitter = 0;
let accumulatedPacketLoss = 0;
let sampleCount = 0;
let lastUpdateTime = Date.now();

async function setupRTPConnection() {
    peerConnection = new RTCPeerConnection({
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
                
                updateMetrics(jitter, lossRate);
            }
        });
    }, UPDATE_INTERVAL);

    return peerConnection;
}

function evaluateAudioQuality(originalChunk, receivedChunk) {
    // Audio quality metric based on packet integrity
    const qualityScore = receivedChunk ? 
        (receivedChunk.size / originalChunk.size) * 100 : 0;
    
    audioQualityData.push(qualityScore);
    
    // Calculate MOS
    const mos = calculateMOS(
        jitterData[jitterData.length - 1] || 0,
        packetLossData[packetLossData.length - 1] || 0
    );
    
    // Update audio quality display
    const averageQuality = audioQualityData.reduce((a, b) => a + b, 0) / audioQualityData.length;
    document.getElementById('audioQuality').innerText = 
        `${averageQuality.toFixed(1)}% (MOS: ${mos.toFixed(2)})`;
}

function calculateMOS(jitter, packetLoss) {
    // Mean Opinion Score calculation (simplified)
    const R = 93.2 - (jitter * 0.24) - (packetLoss * 2.5);
    const MOS = 1 + (0.035 * R) + (R * (R - 60) * (100 - R) * 7e-6);
    return Math.min(Math.max(1, MOS), 5);
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
    
    // Create message to send to server
    const message = JSON.stringify({
        jitter: jitter,
        packetLoss: packetLoss,
        timestamp: Date.now(),
        chunkSize: chunk.size
    });

    // Send data to UDP server using fetch
    fetch('http://localhost:5004', {
        method: 'POST',
        body: message
    }).catch(err => console.error('Error sending to server:', err));
    
    // Simulate packet loss and evaluate quality
    if (Math.random() * 100 > packetLoss) {
        setTimeout(() => {
            receivedChunks.push(chunk);
            evaluateAudioQuality(chunk, chunk);
        }, jitter);
    } else {
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
        const maxDataPoints = 30; // Show last 1 minute of data
        
        if (jitterData.length > maxDataPoints) {
            jitterData.shift();
        }
        if (packetLossData.length > maxDataPoints) {
            packetLossData.shift();
        }

        // Update jitter chart
        jitterChart.data.labels = Array.from({ length: jitterData.length }, (_, i) => i + 1);
        jitterChart.data.datasets[0].data = jitterData;
        jitterChart.update('none');

        // Update packet loss chart
        packetLossChart.data.labels = Array.from({ length: packetLossData.length }, (_, i) => i + 1);
        packetLossChart.data.datasets[0].data = packetLossData;
        packetLossChart.update('none');

        // Update metrics display
        document.getElementById('jitter').innerText = 
            `${jitterData[jitterData.length - 1].toFixed(2)} ms`;
        document.getElementById('packetLoss').innerText = 
            `${packetLossData[packetLossData.length - 1].toFixed(2)}%`;
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
        audioQualityData = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
            simulateNetworkTransmission(event.data);
        };

        mediaRecorder.start(100); // Record in 100ms chunks
        await setupRTPConnection();
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

    if (peerConnection) {
        peerConnection.close();
    }

    mediaRecorder.onstop = () => {
        const originalBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const receivedBlob = new Blob(receivedChunks, { type: 'audio/webm' });
        
        document.getElementById('originalAudio').src = URL.createObjectURL(originalBlob);
        document.getElementById('receivedAudio').src = URL.createObjectURL(receivedBlob);
    };

    document.getElementById('startRecording').disabled = false;
    document.getElementById('stopRecording').disabled = true;
});

function initializeGraphs() {
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
            },
            animation: false
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
            },
            animation: false
        }
    });
}
