// SONUM - Dashboard Controller
// Manages dual workspace roles, project updates, bookings accepted/rejected, and escrow payouts

let dashboardControllers = null;

function createDashboardControllers() {
    if (dashboardControllers) return dashboardControllers;

    const state = {
        sessionUser: null,
        escapeHandler: null,
        modalCloseHandler: null,
        keydownHandler: null
    };

    const init = () => {
        state.sessionUser = JSON.parse(localStorage.getItem('sonumCurrentUser') || 'null');
        initDashboardSystem(state);
        initWorkspaceSwitchBtn(state);
        initLogoutHandler(state);
        initProfileEditor(state);
        initBookingActions(state);
        initDemoUploadModal(state);
    };

    dashboardControllers = { state, init };
    return dashboardControllers;
}

document.addEventListener('DOMContentLoaded', () => {
    createDashboardControllers().init();
});

function initDashboardSystem(state) {
    state.sessionUser = JSON.parse(localStorage.getItem('sonumCurrentUser') || 'null');
    sessionUser = state.sessionUser;
    
    if (!sessionUser) {
        window.location.href = 'index.html';
        return;
    }

    // Default project database seed
    if (!localStorage.getItem('sonumClientProjects')) {
        const defaultProjects = [
            { title: "Global fintech launch film", words: 750, usage: "global broadcast", budget: 1000, date: "06/18/2026", progress: 68, status: "Recording stage" },
            { title: "Internal corporate training module", words: 520, usage: "internal corporate", budget: 600, date: "06/19/2026", progress: 35, status: "Audition compare stage" }
        ];
        localStorage.setItem('sonumClientProjects', JSON.stringify(defaultProjects));
    }

    // Default logs seed
    if (!localStorage.getItem('sonumCommLogs')) {
        const defaultLogs = [
            "<strong>14:05</strong> Audition feedback logged: \"soften the brand name...\"",
            "<strong>11:15</strong> Alex Carter submitted audition read files",
            "<strong>09:40</strong> Project \"fintech\" broadcasted to matching tags"
        ];
        localStorage.setItem('sonumCommLogs', JSON.stringify(defaultLogs));
    }

    // Default bookings seed
    if (!localStorage.getItem('sonumBookings')) {
        const defaultBookings = [
            { id: "b1", title: "Commercial Spot - Energy Drink", status: "pending", date: "June 20, 2026", type: "Commercial & Adverts", amount: 250 },
            { id: "b2", title: "Podcast Narration - Tech Trends", status: "confirmed", date: "June 25, 2026", type: "Audiobooks & Narration", amount: 400 },
            { id: "b3", title: "Video Game NPC - Fantasy RPG", status: "completed", date: "June 12, 2026", type: "Animation & Gaming", amount: 600 }
        ];
        localStorage.setItem('sonumBookings', JSON.stringify(defaultBookings));
    }

    renderWorkspaceLayout(state);
}

// Workspace Swapper: Switch perspectives dynamically for manual review
function initWorkspaceSwitchBtn(state) {
    const toggleBtn = document.getElementById('workspaceToggleBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const nextRole = state.sessionUser.userRole === 'client' ? 'talent' : 'client';
        state.sessionUser.userRole = nextRole;
        localStorage.setItem('sonumCurrentUser', JSON.stringify(state.sessionUser));
        
        const users = JSON.parse(localStorage.getItem('sonumUsers') || '{}');
        if (users[state.sessionUser.email]) {
            users[state.sessionUser.email].userRole = nextRole;
            localStorage.setItem('sonumUsers', JSON.stringify(users));
        }

        renderWorkspaceLayout(state);
        showFeedbackToast(`Switched to ${nextRole === 'client' ? 'Client' : 'Voice Actor'} Workspace.`, "success");
    });
}

function renderWorkspaceLayout(state) {
    if (!state || !state.sessionUser) {
        return;
    }

    const isClient = state.sessionUser?.userRole === 'client';
    const workspaceRoleLabel = document.getElementById('workspaceRoleLabel');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    const talentWorkspaceSection = document.getElementById('talentWorkspaceSection');
    const clientWorkspaceSection = document.getElementById('clientWorkspaceSection');

    if (workspaceRoleLabel) workspaceRoleLabel.textContent = isClient ? "Client / Hirer Workspace" : "Voice Actor Workspace";
    if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${state.sessionUser?.fullName || 'User'}!`;
    if (welcomeSubtitle) welcomeSubtitle.textContent = isClient
        ? `Oversee your active castings and escrow payouts.`
        : `You have earned $${((state.sessionUser?.earnings || 0)).toLocaleString()} this month`;

    if (talentWorkspaceSection) talentWorkspaceSection.style.display = isClient ? 'none' : 'block';
    if (clientWorkspaceSection) clientWorkspaceSection.style.display = isClient ? 'block' : 'none';

    if (isClient) {
        populateClientWorkspace();
    } else {
        populateTalentWorkspace(state);
    }
}

// Client Dashboard Population
function populateClientWorkspace() {
    const projectsList = document.getElementById('clientActiveProjectsList');
    const rosterList = document.getElementById('savedRosterList');
    const logsList = document.getElementById('communicationLogsList');
    const releaseBtn = document.getElementById('releaseEscrowBtn');

    if (projectsList) {
        const projects = JSON.parse(localStorage.getItem('sonumClientProjects') || '[]');
        projectsList.innerHTML = '';
        projects.forEach(p => {
            const row = document.createElement('div');
            row.className = 'project-row';
            row.innerHTML = `
                <span>${p.title}</span>
                <strong>${p.status}</strong>
                <progress value="${p.progress}" max="100"></progress>
            `;
            projectsList.appendChild(row);
        });
    }
    if (rosterList) {
        const saved = JSON.parse(localStorage.getItem('sonumSavedRoster') || '[]');
        rosterList.innerHTML = '';
        if (saved.length === 0) {
            rosterList.innerHTML = `<li><ion-icon name="information-circle-outline"></ion-icon> Saved roster is empty.</li>`;
        } else {
            saved.forEach(name => {
                const li = document.createElement('li');
                li.innerHTML = `<ion-icon name="person-outline"></ion-icon> ${name} (Saved Favorited)`;
                rosterList.appendChild(li);
            });
        }
    }

    if (logsList) {
        const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
        logsList.innerHTML = '';
        logs.forEach(l => {
            const li = document.createElement('li');
            li.innerHTML = l;
            logsList.appendChild(li);
        });
    }

    const isFunded = localStorage.getItem('sonumEscrowStatus') === 'funded';
    const billingEscrowHeld = document.getElementById('billingEscrowHeld');
    const billingPlatformFee = document.getElementById('billingPlatformFee');
    if (billingEscrowHeld) billingEscrowHeld.textContent = isFunded ? '$1,000' : '$0';
    if (billingPlatformFee) billingPlatformFee.textContent = isFunded ? '$80' : '$0';

    if (releaseBtn) {
        releaseBtn.disabled = !isFunded;
        releaseBtn.style.opacity = isFunded ? '1' : '0.5';
    }
}

// Client releases held escrow payouts to the Voice Actor
function initEscrowReleaseHandler() {
    const releaseBtn = document.getElementById('releaseEscrowBtn');
    if (!releaseBtn) return;

    releaseBtn.addEventListener('click', () => {
        // Clear escrow status
        localStorage.removeItem('sonumEscrowStatus');
        localStorage.removeItem('sonumEscrowAmount');

        // Add payout release transaction to communication logs
        const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
        logs.unshift(`<strong>${new Date().toLocaleTimeString().substring(0, 5)}</strong> Escrow Payout Released. $1,000 credited to talent wallet.`);
        localStorage.setItem('sonumCommLogs', JSON.stringify(logs));

        // Credit the voice actor account directly (Jessica Wong / actor@sonum.io mock seed)
        const users = JSON.parse(localStorage.getItem('sonumUsers') || '{}');
        const actorEmail = "actor@sonum.io";
        if (users[actorEmail]) {
            users[actorEmail].earnings += 1000;
            users[actorEmail].projects += 1;
            users[actorEmail].hours += 4;
            localStorage.setItem('sonumUsers', JSON.stringify(users));
            
            // If logged in as actor, refresh profile object state immediately
            if (sessionUser.email === actorEmail) {
                sessionUser = { ...sessionUser, ...users[actorEmail] };
                localStorage.setItem('sonumCurrentUser', JSON.stringify(sessionUser));
            }
        }

        // Set bookings status to completed
        const bookings = JSON.parse(localStorage.getItem('sonumBookings') || '[]');
        bookings.forEach(b => {
            if (b.status === 'confirmed' || b.status === 'pending') {
                b.status = 'completed';
            }
        });
        localStorage.setItem('sonumBookings', JSON.stringify(bookings));

        populateClientWorkspace();
        showFeedbackToast("Escrow funds released to talent wallet successfully.", "success");
    });
}
window.initEscrowReleaseHandler = initEscrowReleaseHandler;
document.addEventListener('DOMContentLoaded', initEscrowReleaseHandler);

// Talent Dashboard Population
function populateTalentWorkspace(state) {
    if (document.getElementById('statProjects')) document.getElementById('statProjects').textContent = state.sessionUser?.projects || 0;
    if (document.getElementById('statHours')) document.getElementById('statHours').textContent = state.sessionUser?.hours || 0;
    if (document.getElementById('statEarnings')) document.getElementById('statEarnings').textContent = `$${((state.sessionUser?.earnings || 0)).toLocaleString()}`;
    if (document.getElementById('statRating')) document.getElementById('statRating').textContent = (state.sessionUser?.rating || 5.0).toFixed(1);

    if (document.getElementById('profileName')) document.getElementById('profileName').textContent = state.sessionUser?.fullName || 'Talent';
    if (document.getElementById('profileSpecialty')) document.getElementById('profileSpecialty').textContent = state.sessionUser?.specialty || "General Vocalist";
    if (document.getElementById('profileRating')) document.getElementById('profileRating').textContent = (state.sessionUser?.rating || 5.0).toFixed(1);
    if (document.getElementById('profileReviews')) document.getElementById('profileReviews').textContent = state.sessionUser?.reviews || 0;
    if (document.getElementById('profileProjects')) document.getElementById('profileProjects').textContent = state.sessionUser?.projects || 0;
    if (document.getElementById('profileBio')) document.getElementById('profileBio').textContent = state.sessionUser?.bio || '';

    if (document.getElementById('profileAttrAge')) document.getElementById('profileAttrAge').textContent = state.sessionUser?.age || "25-45";
    if (document.getElementById('profileAttrTone')) document.getElementById('profileAttrTone').textContent = state.sessionUser?.tone || "Warm, confident";
    if (document.getElementById('profileAttrAccent')) document.getElementById('profileAttrAccent').textContent = state.sessionUser?.accent || "Neutral American";
    if (document.getElementById('profileAttrLang')) document.getElementById('profileAttrLang').textContent = state.sessionUser?.lang || "English";
    if (document.getElementById('profileEquipMic')) document.getElementById('profileEquipMic').textContent = state.sessionUser?.mic || "Neumann TLM 103";
    if (document.getElementById('profileEquipInterface')) document.getElementById('profileEquipInterface').textContent = state.sessionUser?.interface || "Apollo Twin Duo";
    if (document.getElementById('profileEquipRoom')) document.getElementById('profileEquipRoom').textContent = state.sessionUser?.room || "Treated Booth";
    if (document.getElementById('profileTurnaround')) document.getElementById('profileTurnaround').textContent = state.sessionUser?.turnaround || "24 hours";

    renderBookingRequests();
}

function renderBookingRequests() {
    const grid = document.getElementById('bookingsGrid');
    if (!grid) return;

    const bookings = JSON.parse(localStorage.getItem('sonumBookings') || '[]');
    grid.innerHTML = '';

    bookings.forEach(b => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.dataset.bookingId = b.id;

        let statusClass = b.status.toLowerCase();
        let buttonBlock = '';

        if (b.status === 'pending') {
            buttonBlock = `
                <div style="display:flex; gap: 0.5rem; margin-top: auto;">
                    <button class="btn primary-btn booking-accept-btn" style="flex:1; padding: 0.55rem; font-size: 0.8rem;"><ion-icon name="checkmark-outline"></ion-icon> Accept</button>
                    <button class="btn secondary-btn booking-reject-btn" style="flex:1; padding: 0.55rem; font-size: 0.8rem;"><ion-icon name="close-outline"></ion-icon> Reject</button>
                </div>
            `;
        } else if (b.status === 'confirmed') {
            buttonBlock = `
                <button class="btn secondary-btn booking-submit-btn" style="margin-top: auto; padding: 0.6rem; font-size: 0.85rem;"><ion-icon name="cloud-upload-outline"></ion-icon> Submit Audio Files</button>
            `;
        } else {
            buttonBlock = `
                <button class="btn secondary-btn" style="margin-top: auto; padding: 0.6rem; font-size: 0.85rem;" onclick="alert('Platform escrow receipt loaded successfully.');"><ion-icon name="document-text-outline"></ion-icon> View Receipt</button>
            `;
        }

        card.innerHTML = `
            <div class="booking-status ${statusClass}">${b.status}</div>
            <h4>${b.title}</h4>
            <p class="booking-meta">Timeline: ${b.date}</p>
            <p class="booking-type">${b.type}</p>
            <div class="booking-amount">$${b.amount}</div>
            ${buttonBlock}
        `;
        grid.appendChild(card);
    });

    // Reattach listeners
    initBookingActions();
}

// Accept, reject, or upload files on talent booking requests
function initBookingActions() {
    const acceptBtns = document.querySelectorAll('.booking-accept-btn');
    const rejectBtns = document.querySelectorAll('.booking-reject-btn');
    const submitBtns = document.querySelectorAll('.booking-submit-btn');

    acceptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.booking-card');
            const id = card.dataset.bookingId;
            updateBookingStatus(id, 'confirmed');
            showFeedbackToast("Booking request accepted. Project status set to confirmed.", "success");
        });
    });

    rejectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.booking-card');
            const id = card.dataset.bookingId;
            removeBookingCard(id);
            showFeedbackToast("Booking request declined.", "success");
        });
    });

    submitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.booking-card');
            const id = card.dataset.bookingId;
            updateBookingStatus(id, 'review');
            
            // Set client escrow status to loaded
            localStorage.setItem('sonumEscrowStatus', 'funded');
            
            // Log submission in communications log
            const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
            logs.unshift(`<strong>${new Date().toLocaleTimeString().substring(0, 5)}</strong> Talent submitted audio reels for review. Escrow release request placed.`);
            localStorage.setItem('sonumCommLogs', JSON.stringify(logs));

            showFeedbackToast("Audio files uploaded to secure bucket. Escrow payout release request sent.", "success");
        });
    });
}

function updateBookingStatus(id, nextStatus) {
    const bookings = JSON.parse(localStorage.getItem('sonumBookings') || '[]');
    const match = bookings.find(b => b.id === id);
    if (match) {
        match.status = nextStatus;
        localStorage.setItem('sonumBookings', JSON.stringify(bookings));
        renderBookingRequests();
    }
}

function removeBookingCard(id) {
    const bookings = JSON.parse(localStorage.getItem('sonumBookings') || '[]');
    const filtered = bookings.filter(b => b.id !== id);
    localStorage.setItem('sonumBookings', JSON.stringify(filtered));
    renderBookingRequests();
}

// Profile editing form overlay
function initProfileEditor(state) {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');
    const panel = document.getElementById('profileEditPanel');
    const form = document.getElementById('profileEditForm');

    if (!editBtn || !panel) return;

    editBtn.addEventListener('click', () => {
        panel.classList.add('active');
        const nameInput = document.getElementById('edit-name');
        const specialtyInput = document.getElementById('edit-specialty');
        const turnaroundInput = document.getElementById('edit-turnaround');
        const ageInput = document.getElementById('edit-age');
        const accentInput = document.getElementById('edit-accent');
        const toneInput = document.getElementById('edit-tone');
        const langInput = document.getElementById('edit-lang');
        const micInput = document.getElementById('edit-mic');
        const interfaceInput = document.getElementById('edit-interface');
        const bioInput = document.getElementById('edit-bio');
        if (nameInput) nameInput.value = state.sessionUser?.fullName || '';
        if (specialtyInput) specialtyInput.value = state.sessionUser?.specialty || 'Commercial & Adverts';
        if (turnaroundInput) turnaroundInput.value = state.sessionUser?.turnaround || '24 hours';
        if (ageInput) ageInput.value = state.sessionUser?.age || '25-45';
        if (accentInput) accentInput.value = state.sessionUser?.accent || 'Neutral American';
        if (toneInput) toneInput.value = state.sessionUser?.tone || 'Warm, confident';
        if (langInput) langInput.value = state.sessionUser?.lang || 'English';
        if (micInput) micInput.value = state.sessionUser?.mic || 'Neumann TLM 103';
        if (interfaceInput) interfaceInput.value = state.sessionUser?.interface || 'Apollo Twin Duo';
        if (bioInput) bioInput.value = state.sessionUser?.bio || '';
        panel.scrollIntoView({ behavior: 'smooth' });
    });

    cancelBtn.addEventListener('click', () => {
        panel.classList.remove('active');
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const updated = {
            fullName: document.getElementById('edit-name').value,
            specialty: document.getElementById('edit-specialty').value,
            turnaround: document.getElementById('edit-turnaround').value,
            age: document.getElementById('edit-age').value,
            accent: document.getElementById('edit-accent').value,
            tone: document.getElementById('edit-tone').value,
            lang: document.getElementById('edit-lang').value,
            mic: document.getElementById('edit-mic').value,
            interface: document.getElementById('edit-interface').value,
            bio: document.getElementById('edit-bio').value
        };

        if (window.authSystem?.updateUserProfile) {
            window.authSystem.updateUserProfile(updated);
        }
        state.sessionUser = { ...state.sessionUser, ...updated };

        panel.classList.remove('active');
        populateTalentWorkspace(state);
        showFeedbackToast("Studio profile details updated successfully.", "success");
    });
}

// Modal handling for Audio Demo upload
function initDemoUploadModal(state) {
    const openBtn = document.getElementById('uploadDemoActionBtn');
    const closeBtn = document.getElementById('closeDemoModalBtn');
    const overlay = document.getElementById('demoModalOverlay');
    const modal = document.getElementById('demoUploadModal');
    const form = document.getElementById('demoUploadForm');

    if (!openBtn || !modal) return;

    const closeModal = () => {
        if (overlay) overlay.style.display = 'none';
        modal.style.display = 'none';
    };

    openBtn.addEventListener('click', () => {
        if (overlay) overlay.style.display = 'block';
        modal.style.display = 'block';
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const category = document.getElementById('demo-category').value;
        const fileInput = document.getElementById('demo-file');
        const file = fileInput.files[0];

        if (!file) return;

        // Blueprint pattern for invoking backend S3 upload API:
        /*
        const formData = new FormData();
        formData.append('demoReel', file);
        formData.append('category', category);
        
        try {
            const res = await fetch(`/api/talent/${sessionUser.email}/demo-reels`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            console.log("Audio offload bucket URL returned:", data.audioUrl);
        } catch(err) {
            console.error(err);
        }
        */

            closeModal();
            showFeedbackToast(`File "${file.name}" uploaded. Saved category: ${category}.`, "success");
            form.reset();
        });
    }
}

function initLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.authSystem.logout();
        showFeedbackToast("Logged out successfully.", "success");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    });
}

function showFeedbackToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `auth-message ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
