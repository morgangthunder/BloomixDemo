-- Update true-false-selection to HTML type with actual component code
UPDATE interaction_types 
SET 
  interaction_type_category = 'html',
  html_code = '<div class="true-false-container">
  <!-- Target Statement -->
  <div class="target-statement">
    <div class="label">Select all the TRUE statements:</div>
    <div class="statement" id="targetStatement"></div>
  </div>

  <!-- Fragments Grid -->
  <div class="fragments-grid" id="fragmentsGrid"></div>

  <!-- Instructions -->
  <div class="instructions">
    <p>💡 Tap statements to select them</p>
  </div>

  <!-- Action Button -->
  <div class="actions">
    <button class="submit-btn" id="submitBtn" disabled>Check My Answer</button>
  </div>

  <!-- Score Modal -->
  <div id="scoreModal" class="score-modal-overlay" style="display:none;">
    <div class="score-modal">
      <div class="score-header">
        <h2 id="scoreTitle"></h2>
      </div>
      <div class="score-body">
        <div class="score-section your-score">
          <div class="score-label">Your Score</div>
          <div class="score-value" id="scoreValue"></div>
          <div class="score-breakdown" id="scoreBreakdown"></div>
        </div>
      </div>
      <div class="score-actions">
        <button class="btn-secondary" onclick="playAgain()">Play Again</button>
        <button class="btn-primary" onclick="complete()">Next</button>
      </div>
    </div>
  </div>
</div>',
  css_code = '.true-false-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  color: #ffffff;
  min-height: 100%;
}

.target-statement {
  text-align: center;
  padding: 1rem;
  background: rgba(0, 212, 255, 0.1);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.statement {
  font-size: 1rem;
  font-weight: 600;
}

.fragments-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.fragment-tile {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 1rem;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fragment-tile:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #00d4ff;
  transform: translateY(-2px);
}

.fragment-tile.selected {
  background: rgba(0, 212, 255, 0.2);
  border-color: #00d4ff;
  border-width: 3px;
}

.fragment-tile.correct {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4caf50;
}

.fragment-tile.incorrect {
  background: rgba(244, 67, 54, 0.2);
  border-color: #f44336;
}

.actions {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.submit-btn {
  padding: 1rem 3rem;
  background: #00d4ff;
  color: #0f0f23;
  border: none;
  border-radius: 12px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.score-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.score-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
}

.btn-primary, .btn-secondary {
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #00d4ff;
  color: #0f0f23;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}',
  js_code = '// Get interaction data from parent
const data = window.interactionData || {};
const selectedFragments = new Set();

// Initialize
document.getElementById("targetStatement").textContent = data.targetStatement || "";

// Render fragments
const grid = document.getElementById("fragmentsGrid");
data.fragments?.forEach((fragment, index) => {
  const tile = document.createElement("div");
  tile.className = "fragment-tile";
  tile.textContent = fragment.text;
  tile.onclick = () => toggleFragment(index, tile);
  grid.appendChild(tile);
});

function toggleFragment(index, tile) {
  if (selectedFragments.has(index)) {
    selectedFragments.delete(index);
    tile.classList.remove("selected");
  } else {
    selectedFragments.add(index);
    tile.classList.add("selected");
  }
  document.getElementById("submitBtn").disabled = selectedFragments.size === 0;
}

document.getElementById("submitBtn").onclick = checkAnswers;

function checkAnswers() {
  let correct = 0;
  data.fragments?.forEach((fragment, index) => {
    const tile = grid.children[index];
    const isSelected = selectedFragments.has(index);
    
    if (fragment.isTrueInContext && isSelected) {
      tile.classList.add("correct");
      correct++;
    } else if (!fragment.isTrueInContext && isSelected) {
      tile.classList.add("incorrect");
    }
  });
  
  const score = Math.round((correct / data.fragments.filter(f => f.isTrueInContext).length) * 100);
  document.getElementById("scoreValue").textContent = score + "%";
  document.getElementById("scoreTitle").textContent = score === 100 ? "🎉 Perfect!" : "Good Try!";
  document.getElementById("scoreBreakdown").textContent = correct + " out of " + data.fragments.length;
  document.getElementById("scoreModal").style.display = "flex";
}

function playAgain() {
  document.getElementById("scoreModal").style.display = "none";
  selectedFragments.clear();
  Array.from(grid.children).forEach(tile => {
    tile.className = "fragment-tile";
  });
  document.getElementById("submitBtn").disabled = true;
}

function complete() {
  if (window.parent && window.parent.interactionComplete) {
    window.parent.interactionComplete({ score: parseInt(document.getElementById("scoreValue").textContent) });
  }
}'
WHERE id = 'true-false-selection';

-- Update fragment-builder to HTML type
UPDATE interaction_types 
SET 
  interaction_type_category = 'html',
  html_code = '<div class="fragment-builder">
  <h2>Fragment Builder (Legacy)</h2>
  <p>This is a placeholder for the old fragment builder.</p>
</div>',
  css_code = '.fragment-builder {
  padding: 2rem;
  text-align: center;
  background: #1a1a2e;
  color: #fff;
}',
  js_code = '// Legacy fragment builder
console.log("Fragment builder loaded");'
WHERE id = 'fragment-builder';

-- Show results
SELECT id, name, interaction_type_category, 
       CASE WHEN html_code IS NOT NULL THEN 'YES' ELSE 'NO' END as has_html,
       CASE WHEN css_code IS NOT NULL THEN 'YES' ELSE 'NO' END as has_css,
       CASE WHEN js_code IS NOT NULL THEN 'YES' ELSE 'NO' END as has_js
FROM interaction_types 
ORDER BY name;

