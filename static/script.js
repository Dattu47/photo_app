const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const captureBtn = document.getElementById('captureBtn');

canvas.width = 640;
canvas.height = 480;

let isCountingDown = false;

// Start webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  });

// Hand detection with Mediapipe
const hands = new Hands({locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

const camera = new Camera(video, {
  onFrame: async () => await hands.send({image: video}),
  width: 640,
  height: 480
});
camera.start();

hands.onResults(results => {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  if (results.multiHandLandmarks.length > 0 && !isCountingDown) {
    const hand = results.multiHandLandmarks[0];
    if (isOpenPalm(hand)) {
      console.log("Open palm detected - starting countdown");
      startCountdownAndCapture();
    }
  }
});

function isOpenPalm(landmarks) {
  const tipIds = [8, 12, 16, 20]; // index, middle, ring, pinky tips
  let fingersExtended = 0;
  for (let i = 0; i < tipIds.length; i++) {
    if (landmarks[tipIds[i]].y < landmarks[tipIds[i] - 2].y) {
      fingersExtended++;
    }
  }
  return fingersExtended >= 3;
}

function startCountdownAndCapture() {
  isCountingDown = true;
  let count = 3;
  const countdownText = document.createElement('div');
  countdownText.style.position = 'absolute';
  countdownText.style.top = '50%';
  countdownText.style.left = '50%';
  countdownText.style.transform = 'translate(-50%, -50%)';
  countdownText.style.fontSize = '48px';
  countdownText.style.color = 'red';
  countdownText.style.zIndex = '10';
  countdownText.id = 'countdownText';
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
  const imageData = canvas.toDataURL("image/png");
  const link = document.createElement('a');
  link.href = imageData;
  link.download = "group_photo.png";
  link.click();
}

captureBtn.addEventListener('click', startCountdownAndCapture);

// Voice recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = false;

recognition.onresult = function (event) {
  const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
  console.log("Heard: " + transcript);
  if (transcript.includes("shoot") && !isCountingDown) {
    startCountdownAndCapture();
  }
};

recognition.start();
