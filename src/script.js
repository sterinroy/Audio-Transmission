let audioChunks = [];
let sentAudioChunks = [];
let mediaRecorder;
let sentMediaRecorder;
let jitterData = [];
let packetLossData = [];
let jitterChart;
let packetLossChart;
let recordingInterval;

function initializeGraphs() {
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
  });
}

async function startSentAudioRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  sentMediaRecorder = new MediaRecorder(stream);
  sentMediaRecorder.ondataavailable = (event) => {
    sentAudioChunks.push(event.data);
  };
  sentMediaRecorder.start();
}

document.getElementById('startRecording').addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start();
  startSentAudioRecording();

  document.getElementById('startRecording').disabled = true;
  document.getElementById('stopRecording').disabled = false;

  initializeGraphs();

  recordingInterval = setInterval(() => {
    const jitter = Math.random() * 10;
    const packetLoss = Math.random() * 5;

    jitterData.push(jitter);
    packetLossData.push(packetLoss);

    jitterChart.data.labels.push(jitterData.length);
    jitterChart.data.datasets[0].data = jitterData;
    jitterChart.update();

    packetLossChart.data.labels.push(packetLossData.length);
    packetLossChart.data.datasets[0].data = packetLossData;
    packetLossChart.update();

    document.getElementById('jitter').innerText = jitter.toFixed(2) + ' ms';
    document.getElementById('packetLoss').innerText = packetLoss.toFixed(2) + '%';
  }, 1000);
});

document.getElementById('stopRecording').addEventListener('click', () => {
  mediaRecorder.stop();
  sentMediaRecorder.stop();
  clearInterval(recordingInterval);

  document.getElementById('startRecording').disabled = false;
  document.getElementById('stopRecording').disabled = true;

  const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);
  document.getElementById('originalAudio').src = audioUrl;

  const sentBlob = new Blob(sentAudioChunks, { type: 'audio/wav' });
  const sentUrl = URL.createObjectURL(sentBlob);
  document.getElementById('receivedAudio').src = sentUrl;
});

