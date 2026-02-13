/**
 * Fixed true-false-selection JS - fixes "2 out of 0 correct" by using !! for truthy
 * and fallback when totalTrue is 0.
 */
export const TRUE_FALSE_FIXED_JS = `const getData = () => window.interactionData || {};
const getConfig = () => window.interactionConfig || {};

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

function initializeWhenReady() {
    // Initialize SDK early if available - but only if it doesn't exist or doesn't have saveUserProgress
    if ((!window.aiSDK || typeof window.aiSDK.saveUserProgress !== "function") && typeof window.createIframeAISDK === "function") {
        console.log("[TrueFalse] Initializing window.aiSDK via createIframeAISDK");
        const newSDK = window.createIframeAISDK();
        console.log("[TrueFalse] SDK created, has saveUserProgress:", typeof newSDK.saveUserProgress, "all methods:", newSDK ? Object.keys(newSDK).join(', ') : 'null');
        if (newSDK && typeof newSDK.saveUserProgress === "function") {
            window.aiSDK = newSDK;
            console.log("[TrueFalse] ✅ SDK initialized successfully");
        } else {
            console.warn("[TrueFalse] ⚠️ SDK created but missing saveUserProgress method");
        }
    }
    
    const data = getData();
    const targetStatementEl = document.getElementById("targetStatement");
    const fragmentsGridEl = document.getElementById("fragmentsGrid");
    const submitBtn = document.getElementById("submitBtn");
    const scoreModal = document.getElementById("scoreModal");
    const scoreTitle = document.getElementById("scoreTitle");
    const scoreValue = document.getElementById("scoreValue");
    const scoreBreakdown = document.getElementById("scoreBreakdown");
    const playAgainBtn = scoreModal ? scoreModal.querySelector(".score-actions .btn-secondary") : null;
    const completeBtn = scoreModal ? scoreModal.querySelector(".score-actions .btn-primary") : null;

    if (!targetStatementEl || !fragmentsGridEl || !submitBtn || !scoreModal || !scoreTitle || !scoreValue || !scoreBreakdown || !playAgainBtn || !completeBtn) {
        setTimeout(initializeWhenReady, 50);
        return;
    }

    const targetStatement = getTargetStatement();
    targetStatementEl.textContent = targetStatement;

    function renderFragments() {
        fragmentsGridEl.innerHTML = "";
        const data = getData();
        if (!data.fragments || data.fragments.length === 0) {
            fragmentsGridEl.innerHTML = "<p>No fragments to display.</p>";
            return;
        }

        data.fragments.forEach((fragment, index) => {
            const fragmentTile = document.createElement("div");
            fragmentTile.className = "fragment-tile";
            if (selectedFragments.has(index)) fragmentTile.classList.add("selected");
            if (fragment.feedbackClass) fragmentTile.classList.add(fragment.feedbackClass);
            fragmentTile.textContent = fragment.text;
            fragmentTile.dataset.index = index.toString();
            const showHints = getShowHints();
            if (showHints && fragment.explanation) fragmentTile.title = fragment.explanation;

            fragmentTile.addEventListener("click", () => {
                if (fragmentTile.classList.contains("correct") || fragmentTile.classList.contains("incorrect")) return;
                if (selectedFragments.has(index)) {
                    selectedFragments.delete(index);
                    fragmentTile.classList.remove("selected");
                } else {
                    const maxSelections = getMaxSelections();
                    if (maxSelections && selectedFragments.size >= maxSelections) return;
                    selectedFragments.add(index);
                    fragmentTile.classList.add("selected");
                }
                submitBtn.disabled = selectedFragments.size === 0;
            });
            fragmentsGridEl.appendChild(fragmentTile);
        });
    }

    function checkAnswers() {
        score = 0;
        totalAttempts++;
        let correctCount = 0;
        let totalTrue = 0;
        const data = getData();
        
        if (!data || !data.fragments) return;
        
        data.fragments.forEach((fragment, index) => {
            if (!!fragment.isTrueInContext || !!fragment.isTrue) totalTrue++;
            const fragmentTile = fragmentsGridEl ? fragmentsGridEl.querySelector('[data-index="' + index + '"]') : null;
            if (fragmentTile) {
                if (selectedFragments.has(index)) {
                    if (!!fragment.isTrueInContext || !!fragment.isTrue) {
                        fragmentTile.classList.add("correct");
                        fragment.feedbackClass = "correct";
                        correctCount++;
                    } else {
                        fragmentTile.classList.add("incorrect");
                        fragment.feedbackClass = "incorrect";
                    }
                } else {
                    if (!!fragment.isTrueInContext || !!fragment.isTrue) {
                        fragmentTile.classList.add("missed");
                        fragment.feedbackClass = "missed";
                    }
                }
            }
        });

        if (totalTrue === 0) {
            var _d = window.interactionData || {};
            if (_d.fragments) {
                totalTrue = _d.fragments.filter(function(f) { return !!f.isTrueInContext || !!f.isTrue; }).length;
            }
        }
        if (totalTrue === 0) totalTrue = 1;

        score = (correctCount / totalTrue) * 100;
        scoreTitle.textContent = score >= 100 ? "Perfect!" : "Review your answers";
        scoreValue.textContent = correctCount + " / " + totalTrue + " Correct";
        scoreBreakdown.innerHTML = "<p>You selected " + selectedFragments.size + " statements.</p><p>There were " + totalTrue + " true statements.</p>";

        submitBtn.disabled = true;
        scoreModal.style.display = "flex";

        // Log score calculation for debugging
        console.log("[TrueFalse] Score calculated - correctCount: " + correctCount + ", totalTrue: " + totalTrue + ", score: " + score + ", scoreType: " + typeof score);

        // Ensure score is valid before saving
        const finalScore = (typeof score === 'number' && !isNaN(score) && isFinite(score)) ? Math.round(score * 100) / 100 : 0;
        console.log("[TrueFalse] Final score to save: " + finalScore + " (rounded from " + score + ")");

        // Try to save progress - use createIframeAISDK directly if window.aiSDK doesn't have saveUserProgress
        let sdkToUse = null;
        if (window.aiSDK && typeof window.aiSDK.saveUserProgress === "function") {
            sdkToUse = window.aiSDK;
            console.log("[TrueFalse] Using existing window.aiSDK");
        } else if (typeof window.createIframeAISDK === "function") {
            console.log("[TrueFalse] Creating new SDK instance via createIframeAISDK");
            const newSDK = window.createIframeAISDK();
            console.log("[TrueFalse] New SDK created, methods:", Object.keys(newSDK));
            if (newSDK && typeof newSDK.saveUserProgress === "function") {
                sdkToUse = newSDK;
                window.aiSDK = newSDK; // Store for future use
                console.log("[TrueFalse] New SDK has saveUserProgress, using it");
            } else {
                console.warn("[TrueFalse] New SDK created but missing saveUserProgress. SDK keys:", newSDK ? Object.keys(newSDK) : 'null');
            }
        } else {
            console.warn("[TrueFalse] window.createIframeAISDK not available");
        }

        if (sdkToUse && typeof sdkToUse.saveUserProgress === "function") {
            console.log("[TrueFalse] Calling saveUserProgress with score: " + finalScore);
            const progressData = { score: finalScore, completed: true };
            console.log("[TrueFalse] Progress data object:", JSON.stringify(progressData));
            sdkToUse.saveUserProgress(progressData, function(progress, error) {
                if (error) {
                    console.error("[TrueFalse] Failed to save progress:", error);
                } else {
                    console.log("[TrueFalse] Progress saved successfully. Score in response: " + (progress ? progress.score : 'null'));
                }
            });
        } else {
            console.error("[TrueFalse] Cannot save progress - no valid SDK available. aiSDK:", typeof window.aiSDK, "createIframeAISDK:", typeof window.createIframeAISDK, "sdkToUse:", sdkToUse);
        }
    }

    function closeScoreModal() {
        scoreModal.style.display = "none";
    }

    function playAgain() {
        selectedFragments.clear();
        score = 0;
        closeScoreModal();
        const data = getData();
        if (data && data.fragments) {
            data.fragments.forEach(function(fragment) { delete fragment.feedbackClass; });
        }
        renderFragments();
        submitBtn.disabled = true;
    }

    function complete() {
        if (window.aiSDK && typeof window.aiSDK.completeInteraction === "function") {
            window.aiSDK.completeInteraction();
        }
        closeScoreModal();
    }

    submitBtn.addEventListener("click", checkAnswers);
    playAgainBtn.addEventListener("click", playAgain);
    completeBtn.addEventListener("click", complete);

    renderFragments();
    submitBtn.disabled = true;
}

function startInitialization() {
    const data = getData();
    if (!data.fragments || data.fragments.length === 0) {
        setTimeout(startInitialization, 100);
        return;
    }
    if (document.readyState === "complete" || document.readyState === "interactive") {
        initializeWhenReady();
    } else {
        document.addEventListener("DOMContentLoaded", initializeWhenReady);
    }
}

startInitialization();`;
