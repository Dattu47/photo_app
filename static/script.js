// static/script.js
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureBtn = document.getElementById('captureBtn');
const reverseBtn = document.getElementById('reverseBtn');

canvas.width = 640;
canvas.height = 480;

let isCountingDown = false;
let currentFacingMode = "environment";
let streamRef = null;
let camera; // Mediapipe camera

function startCamera(facingMode) {
  const constraints = {
    video: { facingMode: { exact: facingMode } },
    audio: false
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
      streamRef = stream;
      video.srcObject = stream;
      restartMediapipeCamera();
    })
    .catch(err => {
      console.warn("Facing mode error or not supported:", err);
      fallbackToDefaultCamera();
    });
}

function fallbackToDefaultCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
      streamRef = stream;
      video.srcObject = stream;
      restartMediapipeCamera();
    });
}

reverseBtn.addEventListener('click', () => {
  currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
  startCamera(currentFacingMode);
});

startCamera(currentFacingMode);

// Mediapipe setup
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

function restartMediapipeCamera() {
  if (camera) camera.stop();
  camera = new Camera(video, {
    onFrame: async () => await hands.send({ image: video }),
    width: 640,
    height: 480
  });
  camera.start();
}

hands.onResults(results => {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (results.multiHandLandmarks.length > 0 && !isCountingDown) {
    const hand = results.multiHandLandmarks[0];
    if (isOpenPalm(hand)) {
      startCountdownAndCapture();
    }
  }
});

function isOpenPalm(landmarks) {
  const tipIds = [8, 12, 16, 20];
  let extended = 0;
  for (let i = 0; i < tipIds.length; i++) {
    if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) {
      extended++;
    }
  }
  return extended >= 3;
}

function startCountdownAndCapture() {
  isCountingDown = true;
  let count = 3;

  const countdownText = document.createElement('div');
  countdownText.id = 'countdownText';
  countdownText.style.position = 'absolute';
  countdownText.style.top = '50%';
  countdownText.style.left = '50%';
  countdownText.style.transform = 'translate(-50%, -50%)';
  countdownText.style.fontSize = '48px';
  countdownText.style.color = 'red';
  countdownText.style.zIndex = '10';
  countdownText.style.fontWeight = 'bold';
  countdownText.style.textShadow = '2px 2px black';
  document.body.appendChild(countdownText);

  const countdown = setInterval(() => {
    countdownText.innerText = count;
    count--;
    if (count < 0) {
      clearInterval(countdown);
      document.body.removeChild(countdownText);
      captureImage();
      isCountingDown = false;
    }
  }, 1000);
}

function captureImage() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imgData = canvas.toDataURL("image/png");
  const link = document.createElement('a');
  link.href = imgData;
  link.download = "group_photo.png";
  link.click();
}

captureBtn.addEventListener('click', startCountdownAndCapture);

// Voice Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = false;
recognition.onresult = function (event) {
  const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
  if (transcript.includes("shoot") && !isCountingDown) {
    startCountdownAndCapture();
  }
};
recognition.start();
