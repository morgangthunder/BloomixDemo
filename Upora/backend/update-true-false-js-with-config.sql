-- Update true-false-selection JavaScript to use window.interactionConfig

UPDATE interaction_types
SET js_code = '
// Get interaction data and config from parent
const data = window.interactionData || {};
const config = window.interactionConfig || {};

console.log("[Interaction] 🎯 Data received:", data);
console.log("[Interaction] ⚙️ Config received:", config);

// Use config values with fallbacks
const targetStatement = config.targetStatement || data.targetStatement || "Loading...";
const showHints = config.showHints !== undefined ? config.showHints : false;
const maxSelections = config.maxSelections || null;

console.log("[Interaction] 📋 Using target statement:", targetStatement);
console.log("[Interaction] 💡 Show hints:", showHints);
console.log("[Interaction] 🔢 Max selections:", maxSelections);

const selectedFragments = new Set();
let score = 0;
let totalAttempts = 0;
let classAverage = null; // Placeholder for actual class average

function initializeWhenReady() {
    console.log("[Interaction] 🚀 Script starting...");
    console.log("[Interaction] 🔢 Fragments count:", data.fragments ? data.fragments.length : 0);

    const targetStatementEl = document.getElementById("targetStatement");
    const fragmentsGridEl = document.getElementById("fragmentsGrid");
    const submitBtn = document.getElementById("submitBtn");
    const scoreModalOverlay = document.getElementById("scoreModalOverlay");
    const scoreModal = document.getElementById("scoreModal");
    const scoreValueEl = document.getElementById("scoreValue");
    const scoreBreakdownEl = document.getElementById("scoreBreakdown");
    const playAgainBtn = document.getElementById("playAgainBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (!targetStatementEl || !fragmentsGridEl || !submitBtn || !scoreModalOverlay || !scoreModal || !scoreValueEl || !scoreBreakdownEl || !playAgainBtn || !nextBtn) {
        console.log("[Interaction] ⏳ Waiting for DOM elements...");
        setTimeout(initializeWhenReady, 50); // Retry after 50ms
        return;
    }

    console.log("[Interaction] ✅ DOM ready, initializing...");

    // Set target statement from config or data
    targetStatementEl.textContent = targetStatement;
    console.log("[Interaction] 📝 Set target statement to:", targetStatement);

    // Render fragments
    function renderFragments() {
        console.log("[Interaction] 🧹 Cleared grid");
        fragmentsGridEl.innerHTML = ""; // Clear existing fragments
        if (!data.fragments || data.fragments.length === 0) {
            fragmentsGridEl.innerHTML = "<p>No fragments to display.</p>";
            return;
        }
        console.log("[Interaction] 📋 Rendering " + data.fragments.length + " fragments...");
        data.fragments.forEach((fragment, index) => {
            const fragmentTile = document.createElement("div");
            fragmentTile.className = "fragment-tile";
            
            // Add hint as title attribute if showHints is enabled
            const hintAttr = showHints && fragment.explanation ? 
                ` title="${fragment.explanation}"` : "";
            
            fragmentTile.innerHTML = `<div class="fragment-text"${hintAttr}>${fragment.text}</div>`;
            fragmentTile.addEventListener("click", () => toggleFragment(index));
            fragmentsGridEl.appendChild(fragmentTile);
            console.log("[Interaction] ➕ Added fragment #" + index + ": " + fragment.text.substring(0, 30) + "...");
        });
        console.log("[Interaction] ✅ All fragments rendered!");
        console.log("[Interaction] 📊 Grid children count:", fragmentsGridEl.children.length);
    }

    function toggleFragment(index) {
        // Check if we''ve reached maxSelections
        if (maxSelections && !selectedFragments.has(index) && selectedFragments.size >= maxSelections) {
            console.log("[Interaction] ⚠️ Max selections reached:", maxSelections);
            return; // Don''t allow more selections
        }
        
        if (selectedFragments.has(index)) {
            selectedFragments.delete(index);
        } else {
            selectedFragments.add(index);
        }
        updateFragmentStyles();
        submitBtn.disabled = selectedFragments.size === 0;
    }

    function updateFragmentStyles() {
        const tiles = fragmentsGridEl.children;
        for (let i = 0; i < tiles.length; i++) {
            if (selectedFragments.has(i)) {
                tiles[i].classList.add("selected");
            } else {
                tiles[i].classList.remove("selected");
            }
        }
    }

    function checkAnswers() {
        let correctCount = 0;
        let totalTrue = 0;
        data.fragments.forEach((fragment, index) => {
            if (fragment.isTrueInContext) totalTrue++;
            if (selectedFragments.has(index) && fragment.isTrueInContext) {
                correctCount++;
            } else if (selectedFragments.has(index) && !fragment.isTrueInContext) {
                // Incorrectly selected a false statement
            } else if (!selectedFragments.has(index) && fragment.isTrueInContext) {
                // Missed a true statement
            }
        });

        // Calculate score (simple: percentage of correctly identified true statements)
        score = totalTrue > 0 ? Math.round((correctCount / totalTrue) * 100) : 0;

        scoreValueEl.textContent = score + "%";
        scoreBreakdownEl.textContent = `${correctCount} out of ${totalTrue} true statements identified.`;

        // Show score modal
        scoreModalOverlay.style.display = "flex";
        scoreModal.style.display = "block";
    }

    function closeScoreModal() {
        scoreModalOverlay.style.display = "none";
        scoreModal.style.display = "none";
    }

    function playAgain() {
        selectedFragments.clear();
        score = 0;
        submitBtn.disabled = true;
        closeScoreModal();
        renderFragments(); // Re-render to clear feedback styles
    }

    // Event Listeners
    submitBtn.addEventListener("click", checkAnswers);
    playAgainBtn.addEventListener("click", playAgain);
    nextBtn.addEventListener("click", () => {
        alert("Interaction Completed! (Next button clicked)");
        closeScoreModal();
    });
    scoreModalOverlay.addEventListener("click", closeScoreModal);

    // Initial render
    renderFragments();
    submitBtn.disabled = true; // Initially disabled

    console.log("[Interaction] ✅✅✅ FULLY INITIALIZED ✅✅✅");
}

// Wait for the DOM to be fully loaded before initializing
if (document.readyState === "complete" || document.readyState === "interactive") {
    console.log("[Interaction] ▶️ Document already ready, initializing now...");
    initializeWhenReady();
} else {
    console.log("[Interaction] ⏳ Document not ready, adding DOMContentLoaded listener...");
    document.addEventListener("DOMContentLoaded", initializeWhenReady);
}
'
WHERE id = 'true-false-selection';

