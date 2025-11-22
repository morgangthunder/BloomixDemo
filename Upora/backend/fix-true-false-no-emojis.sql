-- Complete rewrite of true-false-selection JavaScript code (no emojis to avoid encoding issues)
-- This ensures it works correctly with window.interactionData and window.interactionConfig

UPDATE interaction_types
SET js_code = '// Get interaction data and config from window (always access directly)
const getData = () => window.interactionData || {};
const getConfig = () => window.interactionConfig || {};

console.log("[Interaction] Initial data check:", getData());
console.log("[Interaction] Initial config check:", getConfig());

// Get config values with fallbacks
const getTargetStatement = () => {
    const cfg = getConfig();
    const dat = getData();
    return cfg.targetStatement || dat.targetStatement || "Loading...";
};

const getShowHints = () => {
    const cfg = getConfig();
    return cfg.showHints !== undefined ? cfg.showHints : false;
};

const getMaxSelections = () => {
    const cfg = getConfig();
    return cfg.maxSelections || null;
};

const selectedFragments = new Set();
let score = 0;
let totalAttempts = 0;
let classAverage = null;

function initializeWhenReady() {
    console.log("[Interaction] Initializing...");
    
    // Always get fresh data from window
    const data = getData();
    console.log("[Interaction] Data in initializeWhenReady:", data);
    console.log("[Interaction] Fragments count:", data.fragments ? data.fragments.length : 0);
    
    const targetStatementEl = document.getElementById("targetStatement");
    const fragmentsGridEl = document.getElementById("fragmentsGrid");
    const submitBtn = document.getElementById("submitBtn");
    const scoreModal = document.getElementById("scoreModal");
    const scoreTitle = document.getElementById("scoreTitle");
    const scoreValue = document.getElementById("scoreValue");
    const scoreBreakdown = document.getElementById("scoreBreakdown");
    const playAgainBtn = scoreModal?.querySelector(".score-actions .btn-secondary");
    const completeBtn = scoreModal?.querySelector(".score-actions .btn-primary");

    if (!targetStatementEl || !fragmentsGridEl || !submitBtn || !scoreModal || !scoreTitle || !scoreValue || !scoreBreakdown || !playAgainBtn || !completeBtn) {
        console.log("[Interaction] Waiting for DOM elements...");
        setTimeout(initializeWhenReady, 50);
        return;
    }

    console.log("[Interaction] DOM ready, initializing...");

    // Set target statement (always get fresh from window)
    const targetStatement = getTargetStatement();
    targetStatementEl.textContent = targetStatement;
    console.log("[Interaction] Target statement set:", targetStatement);

    // Render fragments
    function renderFragments() {
        console.log("[Interaction] Rendering fragments...");
        fragmentsGridEl.innerHTML = "";
        
        // Always get fresh data from window
        const data = getData();
        console.log("[Interaction] Data in renderFragments:", data);
        console.log("[Interaction] Fragments array:", data.fragments);
        
        if (!data.fragments || data.fragments.length === 0) {
            console.log("[Interaction] No fragments found in data!");
            console.log("[Interaction] window.interactionData:", window.interactionData);
            fragmentsGridEl.innerHTML = "<p>No fragments to display.</p>";
            return;
        }

        console.log("[Interaction] Rendering " + data.fragments.length + " fragments...");
        data.fragments.forEach((fragment, index) => {
            const fragmentTile = document.createElement("div");
            fragmentTile.className = "fragment-tile";
            if (selectedFragments.has(index)) {
                fragmentTile.classList.add("selected");
            }
            if (fragment.feedbackClass) {
                fragmentTile.classList.add(fragment.feedbackClass);
            }
            fragmentTile.textContent = fragment.text;
            fragmentTile.dataset.index = index.toString();

            // Add hint as title attribute if showHints is enabled
            const showHints = getShowHints();
            const hintAttr = showHints && fragment.explanation ? fragment.explanation : '';
            if (hintAttr) {
                fragmentTile.title = hintAttr;
            }

            fragmentTile.addEventListener("click", () => {
                if (fragmentTile.classList.contains("correct") || fragmentTile.classList.contains("incorrect")) {
                    return;
                }

                if (selectedFragments.has(index)) {
                    selectedFragments.delete(index);
                    fragmentTile.classList.remove("selected");
                } else {
                    const maxSelections = getMaxSelections();
                    if (maxSelections && selectedFragments.size >= maxSelections) {
                        console.log("[Interaction] Max selections (" + maxSelections + ") reached.");
                        return;
                    }
                    selectedFragments.add(index);
                    fragmentTile.classList.add("selected");
                }
                submitBtn.disabled = selectedFragments.size === 0;
                console.log("[Interaction] Fragment clicked. Selected count:", selectedFragments.size);
            });
            fragmentsGridEl.appendChild(fragmentTile);
            console.log("[Interaction] Added fragment tile:", fragment.text);
        });
        console.log("[Interaction] All fragments rendered!");
    }

    function checkAnswers() {
        console.log("[Interaction] Checking answers...");
        score = 0;
        totalAttempts++;
        let correctCount = 0;
        let totalTrue = 0;

        // Always get fresh data from window
        const data = getData();
        
        data.fragments.forEach((fragment, index) => {
            if (fragment.isTrueInContext) totalTrue++;
            const fragmentTile = fragmentsGridEl?.querySelector("[data-index=\"" + index + "\"]");
            if (fragmentTile) {
                if (selectedFragments.has(index)) {
                    if (fragment.isTrueInContext) {
                        fragmentTile.classList.add("correct");
                        fragment.feedbackClass = "correct";
                        correctCount++;
                    } else {
                        fragmentTile.classList.add("incorrect");
                        fragment.feedbackClass = "incorrect";
                    }
                } else {
                    if (fragment.isTrueInContext) {
                        fragmentTile.classList.add("missed");
                        fragment.feedbackClass = "missed";
                    }
                }
            }
        });

        score = (correctCount / totalTrue) * 100;
        scoreTitle.textContent = score >= 100 ? "Perfect!" : "Review your answers";
        scoreValue.textContent = correctCount + " / " + totalTrue + " Correct";
        scoreBreakdown.innerHTML = "<p>You selected " + selectedFragments.size + " statements.</p><p>There were " + totalTrue + " true statements.</p>";

        submitBtn.disabled = true;
        showScoreModal();
        console.log("[Interaction] Answers checked. Score:", score);
    }

    function showScoreModal() {
        scoreModal.style.display = "flex";
        console.log("[Interaction] Score modal shown");
    }

    function closeScoreModal() {
        scoreModal.style.display = "none";
        console.log("[Interaction] Score modal hidden");
    }

    function playAgain() {
        console.log("[Interaction] Playing again...");
        selectedFragments.clear();
        score = 0;
        closeScoreModal();
        // Always get fresh data from window
        const data = getData();
        data.fragments.forEach(fragment => {
            delete fragment.feedbackClass;
        });
        renderFragments();
        submitBtn.disabled = true;
    }

    function complete() {
        console.log("[Interaction] Completing interaction...");
        alert("Interaction Completed! (In a real app, this would save progress)");
        closeScoreModal();
    }

    // Event Listeners
    submitBtn.addEventListener("click", checkAnswers);
    playAgainBtn.addEventListener("click", playAgain);
    completeBtn.addEventListener("click", complete);

    // Initial render
    renderFragments();
    submitBtn.disabled = true;

    console.log("[Interaction] FULLY INITIALIZED");
}

// Start initialization - wait for DOM and data
function startInitialization() {
    console.log("[Interaction] Starting initialization...");
    console.log("[Interaction] Document readyState:", document.readyState);
    console.log("[Interaction] window.interactionData:", window.interactionData);
    console.log("[Interaction] window.interactionConfig:", window.interactionConfig);
    
    // Check if data is available
    const data = getData();
    if (!data.fragments || data.fragments.length === 0) {
        console.log("[Interaction] No data yet, waiting...");
        setTimeout(startInitialization, 100);
        return;
    }
    
    // DOM ready check
    if (document.readyState === "complete" || document.readyState === "interactive") {
        console.log("[Interaction] Document ready, initializing now...");
        initializeWhenReady();
    } else {
        console.log("[Interaction] Waiting for DOMContentLoaded...");
        document.addEventListener("DOMContentLoaded", initializeWhenReady);
    }
}

// Start immediately (data should already be set)
startInitialization();'
WHERE id = 'true-false-selection';


