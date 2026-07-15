// SONUM - Hirers & Browse Marketplace Interactions
// Handles advanced multi-tagging filtration, inline custom scrubbing playback, and checkout pipelines

document.addEventListener('DOMContentLoaded', () => {
    initBrowseFilters();
    initWaveformPlayerEngine();
    initCastingCallForm();
    initEscrowSystem();
    initAuditionRevisionLogger();
    initRosterSaving();
    initReadTimeEstimator();
});

// Advanced Filtration: query string search, dropdowns, and interactive tag clicks
let activeVocalTags = new Set();

function initBrowseFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const usageFilter = document.getElementById('usageFilter');
    const tagButtons = document.querySelectorAll('.filter-tag-btn');

    if (!searchInput && !categoryFilter && !usageFilter) return;

    // Attach listeners
    searchInput.addEventListener('input', applyMarketplaceFiltering);
    categoryFilter.addEventListener('change', applyMarketplaceFiltering);
    usageFilter.addEventListener('change', applyMarketplaceFiltering);

    tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tagValue = btn.dataset.tag.toLowerCase();
            if (activeVocalTags.has(tagValue)) {
                activeVocalTags.delete(tagValue);
                btn.classList.remove('active');
            } else {
                activeVocalTags.add(tagValue);
                btn.classList.add('active');
            }
            applyMarketplaceFiltering();
        });
    });
}

function applyMarketplaceFiltering() {
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const category = (document.getElementById('categoryFilter')?.value || '').toLowerCase();
    const usage = (document.getElementById('usageFilter')?.value || '').toLowerCase();
    
    let matchesCount = 0;
    const cards = document.querySelectorAll('.talent-card-large');

    cards.forEach(card => {
        const searchPool = [
            card.dataset.search || '',
            card.dataset.tags || '',
            card.querySelector('h3')?.textContent || '',
            card.querySelector('.specialty')?.textContent || '',
            card.querySelector('.talent-bio')?.textContent || ''
        ].join(' ').toLowerCase();

        // Matching conditions
        const queryMatch = !query || searchPool.includes(query);
        const categoryMatch = !category || searchPool.includes(category.split(' ')[0]);
        const usageMatch = !usage || (card.dataset.usage || '').toLowerCase() === usage;
        
        // Multi-tag matching
        let tagsMatch = true;
        activeVocalTags.forEach(tag => {
            if (!searchPool.includes(tag)) {
                tagsMatch = false;
            }
        });

        const visible = queryMatch && categoryMatch && usageMatch && tagsMatch;
        card.style.display = visible ? 'flex' : 'none';
        if (visible) matchesCount++;
    });

    const grid = document.getElementById('talentGrid');
    if (grid) {
        grid.setAttribute('data-result-count', `${matchesCount} matching voice profiles found`);
    }
}

// Waveform Player Dock Logic
let currentPlaybackState = {
    talentName: '',
    demoReel: '',
    duration: 0,
    elapsed: 0,
    isPlaying: false,
    audio: null,
    rafId: null
};

function initWaveformPlayerEngine() {
    const playButtons = document.querySelectorAll('.listen-btn');
    const playerToggle = document.getElementById('playerToggle');
    const playerToggleIcon = document.getElementById('playerToggleIcon');
    const waveformTrack = document.getElementById('waveformTrack');
    const playerTime = document.getElementById('playerTime');

    if (!playerToggle || !waveformTrack) return;

    playButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const talent = btn.dataset.talent;
            const demo = btn.dataset.demo;
            const duration = Number(btn.dataset.duration || 30);

            // If clicking the currently loaded voice, play/pause instead
            if (currentPlaybackState.talentName === talent && currentPlaybackState.demoReel === demo) {
                togglePlayerState();
                return;
            }

            // Load new audio reel state
            loadAudioReel(talent, demo, duration);
            
            // Set listen button states in grid
            resetListenButtonLabels();
            btn.innerHTML = `<ion-icon name="pause-outline"></ion-icon> Pause Reel`;
        });
    });

    playerToggle.addEventListener('click', togglePlayerState);

    // Scrubbing calculation on click
    waveformTrack.addEventListener('click', (e) => {
        const rect = waveformTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const progressPercentage = Math.max(0, Math.min(1, clickX / width));
        
        currentPlaybackState.elapsed = Math.round(progressPercentage * currentPlaybackState.duration);
        drawPlayerProgress();
    });
}

function loadAudioReel(talent, demo, duration) {
    stopAudioPlayback();

    currentPlaybackState = {
        talentName: talent,
        demoReel: demo,
        duration: duration,
        elapsed: 0,
        isPlaying: true,
        audio: null,
        rafId: null
    };

    const playerTalentName = document.getElementById('playerTalentName');
    const playerDemoMeta = document.getElementById('playerDemoMeta');
    if (playerTalentName) playerTalentName.textContent = talent;
    if (playerDemoMeta) playerDemoMeta.textContent = demo;

    drawPlayerProgress();
    startNativeAudioPlayback(demo);
}

function togglePlayerState() {
    if (!currentPlaybackState.talentName || currentPlaybackState.talentName === 'Select a reel to preview') return;

    currentPlaybackState.isPlaying = !currentPlaybackState.isPlaying;

    const playIcon = document.getElementById('playerToggleIcon');
    if (playIcon) {
        playIcon.setAttribute('name', currentPlaybackState.isPlaying ? 'pause' : 'play');
    }

    if (currentPlaybackState.isPlaying) {
        if (currentPlaybackState.audio) {
            currentPlaybackState.audio.play().catch(() => {});
        }
        startAudioFrameLoop();
    } else {
        if (currentPlaybackState.audio) {
            currentPlaybackState.audio.pause();
        }
        stopAudioFrameLoop();
        resetListenButtonLabels();
    }
}

function startNativeAudioPlayback(demo) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = demo && demo.includes('http') ? demo : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    audio.addEventListener('durationchange', () => {
        currentPlaybackState.duration = Math.round(audio.duration || currentPlaybackState.duration || 30);
        drawPlayerProgress();
    });
    audio.addEventListener('timeupdate', () => {
        currentPlaybackState.elapsed = Math.round(audio.currentTime || 0);
        drawPlayerProgress();
    });
    audio.addEventListener('ended', () => {
        currentPlaybackState.isPlaying = false;
        currentPlaybackState.elapsed = currentPlaybackState.duration;
        drawPlayerProgress();
        resetListenButtonLabels();
        const playIcon = document.getElementById('playerToggleIcon');
        if (playIcon) playIcon.setAttribute('name', 'play');
    });

    currentPlaybackState.audio = audio;
    audio.play().catch(() => {});
    startAudioFrameLoop();
}

function startAudioFrameLoop() {
    stopAudioFrameLoop();
    const step = () => {
        if (currentPlaybackState.audio && currentPlaybackState.isPlaying) {
            currentPlaybackState.elapsed = Math.round(currentPlaybackState.audio.currentTime || currentPlaybackState.elapsed);
            drawPlayerProgress();
        }
        currentPlaybackState.rafId = window.requestAnimationFrame(step);
    };
    currentPlaybackState.rafId = window.requestAnimationFrame(step);
}

function stopAudioFrameLoop() {
    if (currentPlaybackState.rafId) {
        window.cancelAnimationFrame(currentPlaybackState.rafId);
        currentPlaybackState.rafId = null;
    }
}

function stopAudioPlayback() {
    stopAudioFrameLoop();
    if (currentPlaybackState.audio) {
        currentPlaybackState.audio.pause();
        currentPlaybackState.audio.currentTime = 0;
    }
}

function drawPlayerProgress() {
    const progressFill = document.getElementById('waveformProgress');
    const playerTime = document.getElementById('playerTime');
    const waveformTrack = document.getElementById('waveformTrack');

    if (!progressFill || !playerTime) return;

    const percentage = currentPlaybackState.duration > 0 
        ? (currentPlaybackState.elapsed / currentPlaybackState.duration) * 100 
        : 0;

    progressFill.style.width = `${percentage}%`;
    playerTime.textContent = `${formatTimelineSeconds(currentPlaybackState.elapsed)} / ${formatTimelineSeconds(currentPlaybackState.duration)}`;
    
    if (waveformTrack) {
        waveformTrack.setAttribute('aria-valuenow', Math.round(percentage));
    }
}

function formatTimelineSeconds(sec) {
    const mins = Math.floor(sec / 60);
    const rem = String(sec % 60).padStart(2, '0');
    return `${mins}:${rem}`;
}

function resetListenButtonLabels() {
    document.querySelectorAll('.listen-btn').forEach(btn => {
        btn.innerHTML = `<ion-icon name="play-outline"></ion-icon> Listen to Reel`;
    });
}

// Escrow settlement UI flow
function initEscrowSystem() {
    const fundBtn = document.getElementById('fundEscrowBtn');
    const escrowStatus = document.getElementById('escrowStatus');

    if (!fundBtn) return;

    fundBtn.addEventListener('click', () => {
        // Toggle step states
        document.getElementById('step-1').style.borderColor = 'var(--accent-primary)';
        document.getElementById('step-1').style.background = 'rgba(16, 185, 129, 0.05)';
        document.getElementById('step-2').classList.add('active-step');
        document.getElementById('step-2').style.borderColor = 'var(--accent-indigo)';
        
        escrowStatus.textContent = "Milestone escrow funded: $1,000. Release is pending client approval of recorded audio.";
        
        // Log transaction log in local communication log
        const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
        logs.unshift(`<strong>${new Date().toLocaleTimeString().substring(0, 5)}</strong> Escrow checkout confirmed. Held balance: $1,000.`);
        localStorage.setItem('sonumCommLogs', JSON.stringify(logs));

        // Save active project billing
        localStorage.setItem('sonumEscrowStatus', 'funded');
        localStorage.setItem('sonumEscrowAmount', '1000');

        showToastNotification("Escrow Checkout Complete. $1,000 held securely.", "success");
    });
}

// Broadcasting casting jobs
function initCastingCallForm() {
    const form = document.getElementById('jobPostingForm');
    const wordsField = document.getElementById('jobWords');
    const readTimeLabel = document.getElementById('readTimeEstimate');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('jobTitle')?.value || '';
        const words = document.getElementById('jobWords')?.value || '';
        const usage = document.getElementById('jobUsage')?.value || '';
        const budget = document.getElementById('jobBudget')?.value || '';

        const newJob = {
            title,
            words,
            usage,
            budget,
            date: new Date().toLocaleDateString(),
            progress: 15,
            status: "Auditions Stage"
        };

        // Add to Client Projects database
        const projects = JSON.parse(localStorage.getItem('sonumClientProjects') || '[]');
        projects.unshift(newJob);
        localStorage.setItem('sonumClientProjects', JSON.stringify(projects));

        // Add communication logs
        const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
        logs.unshift(`<strong>${new Date().toLocaleTimeString().substring(0, 5)}</strong> Broad-casted casting call for "${title}" to matching descriptors.`);
        localStorage.setItem('sonumCommLogs', JSON.stringify(logs));

        showToastNotification("Casting call published to matching talent matching tag filters.", "success");
        form.reset();
        if (readTimeLabel) readTimeLabel.textContent = 'Estimated read time: 0:00';
    });

    if (wordsField && readTimeLabel) {
        wordsField.addEventListener('input', () => {
            const words = Number(wordsField.value || 0);
            const estimateSeconds = Math.round(words / 140 * 60);
            const minutes = Math.floor(estimateSeconds / 60);
            const seconds = estimateSeconds % 60;
            readTimeLabel.textContent = `Estimated read time: ${minutes}:${String(seconds).padStart(2, '0')}`;
        });
    }
}

function initReadTimeEstimator() {
    const wordsField = document.getElementById('jobWords');
    const readTimeLabel = document.getElementById('readTimeEstimate');
    if (!wordsField || !readTimeLabel) return;

    wordsField.addEventListener('input', () => {
        const words = Number(wordsField.value || 0);
        const estimateSeconds = Math.round(words / 140 * 60);
        const minutes = Math.floor(estimateSeconds / 60);
        const seconds = estimateSeconds % 60;
        readTimeLabel.textContent = `Estimated read time: ${minutes}:${String(seconds).padStart(2, '0')}`;
    });
}

// Revision Notes Audition comparisons
function initAuditionRevisionLogger() {
    const saveBtn = document.getElementById('saveRevisionBtn');
    const textarea = document.getElementById('revisionNote');

    if (!saveBtn || !textarea) return;

    saveBtn.addEventListener('click', () => {
        const note = textarea.value.trim();
        if (!note) {
            showToastNotification("Please input a performance revision note.", "error");
            return;
        }

        const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
        logs.unshift(`<strong>${new Date().toLocaleTimeString().substring(0, 5)}</strong> Audition feedback logged: "${note.substring(0, 35)}..."`);
        localStorage.setItem('sonumCommLogs', JSON.stringify(logs));

        showToastNotification("Revision notes sent to casting audition channels.", "success");
    });

    // Sub Audition plays feedback
    document.querySelectorAll('.mini-audio').forEach(btn => {
        btn.addEventListener('click', () => {
            const hasPlay = btn.innerHTML.includes('play-circle');
            if (hasPlay) {
                btn.innerHTML = `<ion-icon name="pause-circle-outline"></ion-icon> Stop Read`;
            } else {
                btn.innerHTML = `<ion-icon name="play-circle-outline"></ion-icon> Read ${btn.dataset.src}`;
            }
        });
    });
}

// Favorites Roster Sync
function initRosterSaving() {
    const favButtons = document.querySelectorAll('.roster-btn');
    
    favButtons.forEach(btn => {
        const talent = btn.dataset.talent;
        
        // Load initial favorites state
        const roster = JSON.parse(localStorage.getItem('sonumSavedRoster') || '[]');
        if (roster.includes(talent)) {
            btn.classList.add('is-saved');
            btn.innerHTML = `<ion-icon name="bookmark"></ion-icon> Saved`;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentRoster = JSON.parse(localStorage.getItem('sonumSavedRoster') || '[]');
            const isFavorite = currentRoster.includes(talent);

            let nextRoster;
            if (isFavorite) {
                nextRoster = currentRoster.filter(item => item !== talent);
                btn.classList.remove('is-saved');
                btn.innerHTML = `<ion-icon name="bookmark-outline"></ion-icon> Favorite`;
                showToastNotification(`${talent} removed from saved roster.`, "success");
            } else {
                nextRoster = [...currentRoster, talent];
                btn.classList.add('is-saved');
                btn.innerHTML = `<ion-icon name="bookmark"></ion-icon> Saved`;
                showToastNotification(`${talent} pinned to saved roster.`, "success");
            }
            
            localStorage.setItem('sonumSavedRoster', JSON.stringify(nextRoster));
        });
    });
}

function showToastNotification(msg, type) {
    const toast = document.createElement('div');
    toast.className = `auth-message ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
