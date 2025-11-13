-- Fix the JS code to wait for DOM to be ready
UPDATE interaction_types 
SET js_code = '// Wait for DOM to be ready
(function() {
  // Get interaction data
  const data = window.interactionData || {};
  const selectedFragments = new Set();

  // Wait for elements to exist
  function initializeWhenReady() {
    const grid = document.getElementById("fragmentsGrid");
    const targetStatement = document.getElementById("targetStatement");
    const submitBtn = document.getElementById("submitBtn");
    
    if (!grid || !targetStatement || !submitBtn) {
      console.log("[Interaction] ⏳ Waiting for DOM elements...");
      setTimeout(initializeWhenReady, 50);
      return;
    }

    console.log("[Interaction] ✅ DOM ready, initializing...");
    console.log("[Interaction] 📊 Data:", data);

    // Initialize target statement
    targetStatement.textContent = data.targetStatement || "";

    // Render fragments
    grid.innerHTML = "";
    if (data.fragments && Array.isArray(data.fragments)) {
      console.log("[Interaction] 📋 Rendering", data.fragments.length, "fragments");
      data.fragments.forEach((fragment, index) => {
        const tile = document.createElement("div");
        tile.className = "fragment-tile";
        tile.textContent = fragment.text;
        tile.title = fragment.explanation || "";
        tile.onclick = () => toggleFragment(index, tile);
        grid.appendChild(tile);
      });
    } else {
      console.error("[Interaction] ❌ No fragments in data!");
    }

    // Toggle fragment function
    function toggleFragment(index, tile) {
      if (selectedFragments.has(index)) {
        selectedFragments.delete(index);
        tile.classList.remove("selected");
      } else {
        selectedFragments.add(index);
        tile.classList.add("selected");
      }
      submitBtn.disabled = selectedFragments.size === 0;
    }

    // Check answers
    submitBtn.onclick = () => {
      let correct = 0;
      const trueCount = data.fragments.filter(f => f.isTrueInContext).length;
      
      data.fragments.forEach((fragment, index) => {
        const tile = grid.children[index];
        const isSelected = selectedFragments.has(index);
        
        if (fragment.isTrueInContext && isSelected) {
          tile.classList.add("correct");
          correct++;
        } else if (!fragment.isTrueInContext && isSelected) {
          tile.classList.add("incorrect");
        } else if (fragment.isTrueInContext && !isSelected) {
          tile.classList.add("missed");
        }
      });
      
      const score = Math.round((correct / trueCount) * 100);
      console.log("[Interaction] 📊 Score:", score);
      
      const scoreModal = document.getElementById("scoreModal");
      const scoreValue = document.getElementById("scoreValue");
      const scoreTitle = document.getElementById("scoreTitle");
      const scoreBreakdown = document.getElementById("scoreBreakdown");
      
      if (scoreValue) scoreValue.textContent = score + "%";
      if (scoreTitle) scoreTitle.textContent = score === 100 ? "🎉 Perfect!" : "Good Try!";
      if (scoreBreakdown) scoreBreakdown.textContent = correct + " out of " + data.fragments.length + " correct";
      if (scoreModal) scoreModal.style.display = "flex";
      
      submitBtn.disabled = true;
    };

    console.log("[Interaction] ✅ Initialized successfully");
  }

  // Start initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWhenReady);
  } else {
    initializeWhenReady();
  }
})();'
WHERE id = 'true-false-selection';

SELECT 'Updated JS code for true-false-selection' as result;

