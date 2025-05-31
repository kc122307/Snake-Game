
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Game state
    let game;
    let gameLoop;
    let currentDifficulty = 'medium';
    let currentTheme = 'light';
    let isPaused = false;
    let settings = {
      sound: true,
      particles: true,
      screenShake: true
    };

    // High scores storage
    let highScores = JSON.parse(localStorage.getItem('snakeHighScores')) || {
      easy: 0, medium: 0, hard: 0, extreme: 0
    };

    class SnakeGame {
      constructor(difficulty) {
        this.difficulty = difficulty;
        this.gridSize = 20;
        this.segmentSize = this.gridSize - 4;
        this.tileCount = Math.min(Math.floor(window.innerWidth * 0.8 / this.gridSize), 20);
        this.canvasSize = this.tileCount * this.gridSize;
        canvas.width = this.canvasSize;
        canvas.height = this.canvasSize;
        this.speed = this.getSpeed(difficulty);
        const startX = Math.floor(this.tileCount / 2);
        const startY = Math.floor(this.tileCount / 2);
        this.snake = [
          {x: startX, y: startY}
        ];
        this.food = this.generateFood('apple');
        this.banana = null;
        this.bomb = null;
        this.bombTimer = null;
        this.dx = 1;
        this.dy = 0;
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.isPaused = false;
        this.snakeColor = this.difficulty === 'extreme' ? '#e94560' : '#2ecc71';
        this.lastMoveTime = 0;

        // Make canvas responsive
        this.updateCanvasSize();
        window.addEventListener('resize', () => this.updateCanvasSize());
      }

      updateCanvasSize() {
        const containerWidth = document.getElementById('gameScreen').clientWidth - 60;
        const maxSize = Math.min(containerWidth, 600);
        canvas.style.width = `${maxSize}px`;
        canvas.style.height = `${maxSize}px`;
      }

      getSpeed(difficulty) {
        // Reduced speeds for better gameplay
        const speeds = { 
          easy: 4,      // Slower for easy mode
          medium: 6,    // Moderate speed
          hard: 8,      // Faster but manageable
          extreme: 10   // Fast but not impossible
        };
        return speeds[difficulty] || 6;
      }

      generateFood(type) {
        let food;
        do {
          food = {
          x: Math.floor(Math.random() * this.tileCount),
          y: Math.floor(Math.random() * this.tileCount),
            type: type,
            timer: type === 'bomb' ? 300 : 0
          };
        } while (this.isPositionOccupied(food.x, food.y));

        return food;
      }

      isPositionOccupied(x, y) {
        return this.snake.some(segment => segment.x === x && segment.y === y) ||
               this.food && this.food.x === x && this.food.y === y ||
               this.banana && this.banana.x === x && this.banana.y === y ||
               this.bomb && this.bomb.x === x && this.bomb.y === y;
      }

      spawnPowerUp() {
        if (Math.random() < 0.3) { // 30% chance
          const types = ['banana', 'speed', 'slow', 'shield', 'teleport'];
          if (this.difficulty !== 'easy') types.push('bomb');
          
          const type = types[Math.floor(Math.random() * types.length)];
          const powerUp = this.generateFood(type);
          powerUp.timer = 500; // 5 seconds at 100fps
          this.banana = powerUp;
        }
      }

      createParticles(x, y, color, count = 8) {
        if (!settings.particles) return;
        
        for (let i = 0; i < count; i++) {
          this.particles.push({
            x: x * this.gridSize + this.gridSize/2,
            y: y * this.gridSize + this.gridSize/2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 30,
            maxLife: 30,
            color: color,
            size: Math.random() * 4 + 2
          });
        }
      }

      addScreenShake(intensity) {
        if (!settings.screenShake) return;
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
      }

      showAchievement(text) {
        const notification = document.getElementById('achievementNotification');
        const textElement = document.getElementById('achievementText');
        textElement.textContent = text;
        notification.classList.add('show');
        
        setTimeout(() => {
          notification.classList.remove('show');
        }, 3000);
      }

      playSound(type) {
        if (!settings.sound) return;
        
        // Create simple sound effects using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const sounds = {
          eat: { frequency: 800, duration: 0.1 },
          power: { frequency: 1200, duration: 0.2 },
          death: { frequency: 200, duration: 0.5 },
          level: { frequency: 1500, duration: 0.3 }
        };
        
        const sound = sounds[type] || sounds.eat;
        oscillator.frequency.setValueAtTime(sound.frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + sound.duration);
      }

      moveSnake() {
    const head = {
        x: this.snake[0].x + this.dx,
        y: this.snake[0].y + this.dy
    };

    // End game if the snake touches the boundary
    if (head.x < 0 || head.y < 0 || head.x >= this.tileCount || head.y >= this.tileCount) {
          this.loseLife();
          return;
        }

        // Check if snake hits itself
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
          this.loseLife();
        return;
    }

    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
          this.score += 2;
        this.food = this.generateFood('apple');

        // Random chance to spawn banana or bomb
        const randomSpawn = Math.random();
        if (randomSpawn < 0.3) {
            this.banana = this.generateFood('banana');
        } else if (randomSpawn > 0.7) {
            this.spawnBomb();
          }
        } else {
          this.snake.pop();
    }

    // Check banana collision
    if (this.banana && head.x === this.banana.x && head.y === this.banana.y) {
          this.score += 1;
        this.banana = null;
        }

        // Check bomb collision
        if (this.bomb && head.x === this.bomb.x && head.y === this.bomb.y) {
          this.loseLife();
            return;
        }
    }

      loseLife() {
        this.lives--;
        if (this.lives <= 0) {
        this.gameOver = true;
        return;
    }
        // Reset snake position
        const startX = Math.floor(this.tileCount / 2);
        const startY = Math.floor(this.tileCount / 2);
        this.snake = [{x: startX, y: startY}];
        this.dx = 1;
        this.dy = 0;
        // Clear any existing food items
        this.banana = null;
        this.bomb = null;
        this.food = this.generateFood('apple');
      }

      update() {
        if (this.isPaused || this.gameOver) return;

        const currentTime = Date.now();
        if (currentTime - this.lastMoveTime < 1000 / this.speed) {
          return;
        }
        this.lastMoveTime = currentTime;

        this.moveSnake();
          this.drawGame();
        this.updateUI();
      }

      drawGame() {
        // Clear canvas
        ctx.fillStyle = this.difficulty === 'extreme' ? '#1a1a2e' : 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw snake
        this.snake.forEach((segment, index) => {
          // Create gradient for snake segment
          const gradient = ctx.createRadialGradient(
            segment.x * this.gridSize + this.gridSize/2,
            segment.y * this.gridSize + this.gridSize/2,
            0,
            segment.x * this.gridSize + this.gridSize/2,
            segment.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2
          );

          // Head is darker
          if (index === 0) {
            gradient.addColorStop(0, this.snakeColor);
            gradient.addColorStop(1, this.darkenColor(this.snakeColor, 20));
          } else {
            gradient.addColorStop(0, this.lightenColor(this.snakeColor, 10));
            gradient.addColorStop(1, this.snakeColor);
          }

          ctx.fillStyle = gradient;
          
          // Draw circular segment
          ctx.beginPath();
          ctx.arc(
            segment.x * this.gridSize + this.gridSize/2,
            segment.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Draw eyes on head
          if (index === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = this.segmentSize / 5;
            const eyeOffset = this.segmentSize / 4;
            
            // Position eyes based on direction
            let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
            
            if (this.dx === 1) { // Moving right
              leftEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset;
              leftEyeY = segment.y * this.gridSize + eyeOffset;
              rightEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset;
              rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset;
            } else if (this.dx === -1) { // Moving left
              leftEyeX = segment.x * this.gridSize + eyeOffset;
              leftEyeY = segment.y * this.gridSize + eyeOffset;
              rightEyeX = segment.x * this.gridSize + eyeOffset;
              rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset;
            } else if (this.dy === -1) { // Moving up
              leftEyeX = segment.x * this.gridSize + eyeOffset;
              leftEyeY = segment.y * this.gridSize + eyeOffset;
              rightEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset;
              rightEyeY = segment.y * this.gridSize + eyeOffset;
            } else { // Moving down
              leftEyeX = segment.x * this.gridSize + eyeOffset;
              leftEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset;
              rightEyeX = segment.x * this.gridSize + this.gridSize - eyeOffset;
              rightEyeY = segment.y * this.gridSize + this.gridSize - eyeOffset;
            }

            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Draw food
        if (this.food) {
          const foodGradient = ctx.createRadialGradient(
            this.food.x * this.gridSize + this.gridSize/2,
            this.food.y * this.gridSize + this.gridSize/2,
            0,
            this.food.x * this.gridSize + this.gridSize/2,
            this.food.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2
          );
          foodGradient.addColorStop(0, '#ff6b6b');
          foodGradient.addColorStop(1, '#c92a2a');
          ctx.fillStyle = foodGradient;
          ctx.beginPath();
          ctx.arc(
            this.food.x * this.gridSize + this.gridSize/2,
            this.food.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Draw banana
        if (this.banana) {
          const bananaGradient = ctx.createRadialGradient(
            this.banana.x * this.gridSize + this.gridSize/2,
            this.banana.y * this.gridSize + this.gridSize/2,
            0,
            this.banana.x * this.gridSize + this.gridSize/2,
            this.banana.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2
          );
          bananaGradient.addColorStop(0, '#ffd43b');
          bananaGradient.addColorStop(1, '#fcc419');
          ctx.fillStyle = bananaGradient;
          ctx.beginPath();
          ctx.arc(
            this.banana.x * this.gridSize + this.gridSize/2,
            this.banana.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // Draw bomb
        if (this.bomb) {
          const bombGradient = ctx.createRadialGradient(
            this.bomb.x * this.gridSize + this.gridSize/2,
            this.bomb.y * this.gridSize + this.gridSize/2,
            0,
            this.bomb.x * this.gridSize + this.gridSize/2,
            this.bomb.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2
          );
          bombGradient.addColorStop(0, '#495057');
          bombGradient.addColorStop(1, '#212529');
          ctx.fillStyle = bombGradient;
          ctx.beginPath();
          ctx.arc(
            this.bomb.x * this.gridSize + this.gridSize/2,
            this.bomb.y * this.gridSize + this.gridSize/2,
            this.segmentSize/2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      updateUI() {
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('lengthDisplay').textContent = this.snake.length;
        document.getElementById('levelDisplay').textContent = Math.floor(this.score / 50) + 1;
        document.getElementById('livesDisplay').textContent = this.lives;
        document.getElementById('highScoreDisplay').textContent = highScores[this.difficulty];
        
        const progress = (this.score % 50) * 2;
        document.getElementById('levelProgress').style.width = progress + '%';
      }

      getCurrentSpeed() {
        let speed = this.speed;
        if (this.effects.speedBoost > 0) speed *= 1.5;
        if (this.effects.slowMotion > 0) speed *= 0.5;
        return speed;
      }

      spawnBomb() {
        this.bomb = this.generateFood('bomb');
        this.bombTimer = 300; // 5 seconds at 100fps
      }

      lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
          0x1000000 +
          (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
          (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
          (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
      }

      darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (
          0x1000000 +
          (R > 0 ? (R < 255 ? R : 255) : 0) * 0x10000 +
          (G > 0 ? (G < 255 ? G : 255) : 0) * 0x100 +
          (B > 0 ? (B < 255 ? B : 255) : 0)
        ).toString(16).slice(1);
      }
    }

    // Game control functions
    function showMainMenu() {
      hideAllScreens();
      document.getElementById('mainMenu').style.display = 'block';
      if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
      }
      isPaused = false;
    }

    function showLevelSelect() {
      hideAllScreens();
      document.getElementById('levelSelect').style.display = 'block';
    }

    function showThemeSelect() {
      hideAllScreens();
      document.getElementById('themeSelect').style.display = 'block';
    }

    function showSettings() {
      hideAllScreens();
      document.getElementById('settingsScreen').style.display = 'block';
      
      // Update checkboxes
      document.getElementById('soundToggle').checked = settings.sound;
      document.getElementById('particlesToggle').checked = settings.particles;
      document.getElementById('screenShakeToggle').checked = settings.screenShake;
    }

    function hideAllScreens() {
      const screens = ['mainMenu', 'levelSelect', 'themeSelect', 'gameScreen', 'pauseScreen', 'gameOverScreen', 'settingsScreen'];
      screens.forEach(screen => {
        document.getElementById(screen).style.display = 'none';
      });
    }

    function setTheme(theme) {
      currentTheme = theme;
      document.body.className = theme + '-theme';
      localStorage.setItem('snakeTheme', theme);
      showMainMenu();
    }

    function startGame(difficulty) {
      // Set theme based on difficulty
      if (difficulty === 'extreme') {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }

      // Hide level select, show game screen
      levelSelect.style.display = 'none';
      gameScreen.style.display = 'block';
      canvas.style.display = 'block';

      // Initialize game
      game = new SnakeGame(difficulty);

      // Setup controls
      window.addEventListener('keydown', handleKeyDown);
      setupTouchControls();

      // Start game loop
      gameLoop = setInterval(() => {
        if (game.gameOver) {
          endGame();
        } else {
          game.update();
        }
      }, 1000 / 60); // Run at 60 FPS for smooth movement
    }

    function handleKeyDown(e) {
      if (!game) return;
      
      switch(e.key) {
        case 'ArrowUp':
          if (game.dy === 0) { // Prevent 180-degree turns
            game.dx = 0;
            game.dy = -1;
          }
          break;
        case 'ArrowDown':
          if (game.dy === 0) {
            game.dx = 0;
            game.dy = 1;
          }
          break;
        case 'ArrowLeft':
          if (game.dx === 0) {
            game.dx = -1;
            game.dy = 0;
          }
          break;
        case 'ArrowRight':
          if (game.dx === 0) {
            game.dx = 1;
            game.dy = 0;
          }
          break;
      }
    }

    function setupTouchControls() {
      let touchStartX = 0;
      let touchStartY = 0;

      canvas.addEventListener('touchstart', (e) => {
        if (!game || isPaused) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
      });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
      });

      canvas.addEventListener('touchend', (e) => {
        if (!game || isPaused || !touchStartX || !touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe
          if (dx > 30 && (game.dx !== -1)) {
            game.dx = 1;
            game.dy = 0;
          } else if (dx < -30 && (game.dx !== 1)) {
            game.dx = -1;
            game.dy = 0;
          }
        } else {
          // Vertical swipe
          if (dy > 30 && (game.dy !== -1)) {
            game.dy = 1;
          } else if (dy < -30 && (game.dy !== 1)) {
            game.dy = -1;
          }
        }

        touchStartX = 0;
        touchStartY = 0;
        e.preventDefault();
      });
    }

    function pauseGame() {
      if (!game || game.gameOver) return;
      
      game.isPaused = !game.isPaused;
      if (game.isPaused) {
        document.getElementById('pauseScreen').style.display = 'block';
      } else {
        document.getElementById('pauseScreen').style.display = 'none';
      }
    }

    function resumeGame() {
      if (!game) return;
      game.isPaused = false;
      document.getElementById('pauseScreen').style.display = 'none';
    }

    function restartCurrentGame() {
      document.getElementById('pauseScreen').style.display = 'none';
      document.getElementById('gameOverScreen').style.display = 'none';
      startGame(currentDifficulty);
    }

    function endGame() {
      clearInterval(gameLoop);
      gameLoop = null;
      
      // Check for high score
      if (game.score > highScores[currentDifficulty]) {
        highScores[currentDifficulty] = game.score;
        localStorage.setItem('snakeHighScores', JSON.stringify(highScores));
        document.getElementById('newHighScore').style.display = 'block';
      } else {
        document.getElementById('newHighScore').style.display = 'none';
      }
      
      document.getElementById('finalScoreDisplay').textContent = game.score;
      document.getElementById('gameOverScreen').style.display = 'block';
    }

    // Settings event listeners
    document.getElementById('soundToggle').addEventListener('change', (e) => {
      settings.sound = e.target.checked;
      localStorage.setItem('snakeSettings', JSON.stringify(settings));
    });

    document.getElementById('particlesToggle').addEventListener('change', (e) => {
      settings.particles = e.target.checked;
      localStorage.setItem('snakeSettings', JSON.stringify(settings));
    });

    document.getElementById('screenShakeToggle').addEventListener('change', (e) => {
      settings.screenShake = e.target.checked;
      localStorage.setItem('snakeSettings', JSON.stringify(settings));
    });

    // Load saved settings and theme
    const savedSettings = localStorage.getItem('snakeSettings');
    if (savedSettings) {
      settings = {...settings, ...JSON.parse(savedSettings)};
    }

    const savedTheme = localStorage.getItem('snakeTheme');
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Initialize high score display
    document.getElementById('highScoreDisplay').textContent = highScores.medium;