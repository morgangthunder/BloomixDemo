-- Add extensive debugging to the JS code
UPDATE interaction_types 
SET js_code = '// DEBUGGING VERSION - Wait for DOM and log everything
(function() {
  console.log("[Interaction] 🚀 Script starting...");
  console.log("[Interaction] 📊 window.interactionData:", window.interactionData);
  
  // Get interaction data
  const data = window.interactionData || {};
  console.log("[Interaction] 📋 Parsed data:", data);
  console.log("[Interaction] 🔢 Fragments count:", data.fragments?.length);
  
  const selectedFragments = new Set();

  // Wait for elements to exist
  let retryCount = 0;
  function initializeWhenReady() {
    retryCount++;
    console.log("[Interaction] 🔄 Init attempt #" + retryCount);
    
    const grid = document.getElementById("fragmentsGrid");
    const targetStatement = document.getElementById("targetStatement");
    const submitBtn = document.getElementById("submitBtn");
    
    console.log("[Interaction] 🔍 Found grid:", !!grid);
    console.log("[Interaction] 🔍 Found targetStatement:", !!targetStatement);
    console.log("[Interaction] 🔍 Found submitBtn:", !!submitBtn);
    
    if (!grid || !targetStatement || !submitBtn) {
      if (retryCount < 20) {
        console.log("[Interaction] ⏳ Waiting 50ms, retry #" + retryCount);
        setTimeout(initializeWhenReady, 50);
      } else {
        console.error("[Interaction] ❌ FAILED: Elements not found after 20 retries");
        console.error("[Interaction] 📄 Document HTML:", document.body.innerHTML.substring(0, 500));
      }
      return;
    }

    console.log("[Interaction] ✅ DOM ready, initializing...");

    // Initialize target statement
    try {
      targetStatement.textContent = data.targetStatement || "";
      console.log("[Interaction] ✅ Set target statement:", data.targetStatement);
    } catch (e) {
      console.error("[Interaction] ❌ Error setting target:", e);
    }

    // Render fragments
    try {
      grid.innerHTML = "";
      console.log("[Interaction] 🧹 Cleared grid");
      
      if (data.fragments && Array.isArray(data.fragments)) {
        console.log("[Interaction] 📋 Rendering", data.fragments.length, "fragments...");
        
        data.fragments.forEach((fragment, index) => {
          const tile = document.createElement("div");
          tile.className = "fragment-tile";
          tile.textContent = fragment.text;
          tile.title = fragment.explanation || "";
          tile.onclick = () => toggleFragment(index, tile);
          grid.appendChild(tile);
          console.log("[Interaction] ➕ Added fragment #" + index + ":", fragment.text.substring(0, 30));
        });
        
        console.log("[Interaction] ✅ All fragments rendered!");
        console.log("[Interaction] 📊 Grid children count:", grid.children.length);
      } else {
        console.error("[Interaction] ❌ No fragments array in data!");
        console.error("[Interaction] 📊 Data structure:", JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error("[Interaction] ❌ Error rendering fragments:", e);
    }

    // Toggle fragment function
    function toggleFragment(index, tile) {
      console.log("[Interaction] 🖱️ Clicked fragment #" + index);
      if (selectedFragments.has(index)) {
        selectedFragments.delete(index);
        tile.classList.remove("selected");
      } else {
        selectedFragments.add(index);
        tile.classList.add("selected");
      }
      submitBtn.disabled = selectedFragments.size === 0;
      console.log("[Interaction] 📊 Selected count:", selectedFragments.size);
    }

    // Check answers
    submitBtn.onclick = () => {
      console.log("[Interaction] ✅ Checking answers...");
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
      console.log("[Interaction] 📊 Final score:", score);
      
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

    console.log("[Interaction] ✅✅✅ FULLY INITIALIZED ✅✅✅");
  }

  // Start initialization
  console.log("[Interaction] 🎬 Starting init, readyState:", document.readyState);
  if (document.readyState === "loading") {
    console.log("[Interaction] ⏳ Waiting for DOMContentLoaded...");
    document.addEventListener("DOMContentLoaded", initializeWhenReady);
  } else {
    console.log("[Interaction] ▶️ Document already ready, initializing now...");
    initializeWhenReady();
  }
})();'
WHERE id = 'true-false-selection';

SELECT 'Updated with extensive debugging' as result;

