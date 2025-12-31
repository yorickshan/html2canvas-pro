# Getting Started

## Installing

You can install `html2canvas-pro` through npm or [download a built release](https://github.com/yorickshan/html2canvas-pro/releases).

```sh
npm install html2canvas-pro
pnpm / yarn add html2canvas-pro
```

## Usage

```javascript
import html2canvas from 'html2canvas-pro';
```

To render an `element` with html2canvas-pro with some (optional) [options](./configuration), simply call `html2canvas(element, options);`

```javascript
html2canvas(document.body).then(function(canvas) {
    document.body.appendChild(canvas);
});
```

## Interactive Demo

<div id="demo-section">
  <div class="demo-controls">
    <h3>🎨 Demo Area</h3>
    <div id="capture" class="capture-area">
      <h4>👋 Hello html2canvas-pro!</h4>
      <p>This is an HTML element that can be captured</p>
      <div class="feature-grid">
        <div class="feature-item">
          <strong>🎯 High Accuracy</strong>
          <span>Pixel-perfect rendering</span>
        </div>
        <div class="feature-item">
          <strong>⚡ High Performance</strong>
          <span>Optimized rendering engine</span>
        </div>
        <div class="feature-item">
          <strong>🎨 Full Featured</strong>
          <span>Modern CSS support</span>
        </div>
      </div>
      <p class="tip">✨ Supports modern CSS features like gradients, shadows, rounded corners, transforms, and more</p>
    </div>
    <div class="button-group">
      <button id="captureBtn" class="demo-button primary">📸 Capture Element</button>
      <button id="downloadBtn" class="demo-button success" disabled>💾 Download Image</button>
    </div>
    <div id="status"></div>
    <div id="result"></div>
  </div>
</div>

<style scoped>
.demo-container {
  margin-top: 2rem;
}

#demo-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  margin: 2rem 0;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.demo-controls {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.demo-controls h3 {
  margin-top: 0;
  color: #667eea;
}

.capture-area {
  padding: 30px;
  background: linear-gradient(135deg, #f5da55 0%, #ffa726 100%);
  border-radius: 12px;
  margin: 20px 0;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.capture-area h4 {
  color: #333;
  font-size: 1.8em;
  margin: 0 0 15px 0;
}

.capture-area p {
  color: #555;
  margin: 10px 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.feature-item {
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.feature-item strong {
  display: block;
  color: #667eea;
  margin-bottom: 5px;
}

.feature-item span {
  font-size: 0.9em;
  color: #666;
}

.tip {
  font-size: 0.9em;
  margin-top: 15px !important;
}

.button-group {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.demo-button {
  padding: 12px 24px;
  font-size: 1em;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.demo-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.demo-button:active:not(:disabled) {
  transform: translateY(0);
}

.demo-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-button.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.demo-button.success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

#status {
  margin-top: 20px;
}

.status-message {
  padding: 15px;
  border-radius: 8px;
  font-weight: 600;
  margin: 15px 0;
}

.status-message.success {
  background: #c6f6d5;
  color: #22543d;
}

.status-message.error {
  background: #fed7d7;
  color: #742a2a;
}

.status-message.loading {
  background: #bee3f8;
  color: #2c5282;
  display: flex;
  align-items: center;
  gap: 10px;
}

#result {
  margin-top: 20px;
}

#result h4 {
  color: #667eea;
  margin-bottom: 15px;
}

#result canvas {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  margin-top: 15px;
}

.code-example {
  margin: 2rem 0;
}

@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .demo-button {
    width: 100%;
  }
}
</style>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Dynamically load html2canvas-pro
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/npm/html2canvas-pro/dist/html2canvas-pro.min.js'
  script.onload = initDemo
  document.head.appendChild(script)
})

function initDemo() {
  let currentCanvas = null

  const captureBtn = document.getElementById('captureBtn')
  const downloadBtn = document.getElementById('downloadBtn')
  const statusDiv = document.getElementById('status')
  const resultDiv = document.getElementById('result')

  function showStatus(message, type = 'success') {
    statusDiv.innerHTML = `<div class="status-message ${type}">${message}</div>`
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.innerHTML = ''
      }, 3000)
    }
  }

  function showLoading() {
    statusDiv.innerHTML = '<div class="status-message loading"><span>⏳</span><span>Generating screenshot...</span></div>'
  }

  async function captureElement() {
    try {
      captureBtn.disabled = true
      showLoading()
      resultDiv.innerHTML = ''

      const element = document.getElementById('capture')
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 2
      })

      currentCanvas = canvas
      resultDiv.innerHTML = '<h4>✅ Screenshot Result:</h4>'
      resultDiv.appendChild(canvas)
      
      downloadBtn.disabled = false
      showStatus('✅ Screenshot successful! You can click "Download Image" button to save.', 'success')
    } catch (error) {
      console.error('Capture failed:', error)
      showStatus('❌ Capture failed: ' + error.message, 'error')
    } finally {
      captureBtn.disabled = false
    }
  }

  function downloadImage() {
    if (!currentCanvas) {
      showStatus('❌ Please capture first', 'error')
      return
    }

    const link = document.createElement('a')
    link.download = `screenshot-${Date.now()}.png`
    link.href = currentCanvas.toDataURL('image/png')
    link.click()
    
    showStatus('✅ Image downloaded!', 'success')
  }

  captureBtn.addEventListener('click', captureElement)
  downloadBtn.addEventListener('click', downloadImage)
}
</script>