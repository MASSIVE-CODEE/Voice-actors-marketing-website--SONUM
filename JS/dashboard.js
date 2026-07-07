// SONUM - Dashboard Controller
// Manages dual workspace roles, project updates, bookings accepted/rejected, and escrow payouts

document.addEventListener('DOMContentLoaded', () => {
    initDashboardSystem();
    initWorkspaceSwitchBtn();
    initLogoutHandler();
    initProfileEditor();
    initBookingActions();
    initDemoUploadModal();
});

let sessionUser = null;

function initDashboardSystem() {
    sessionUser = JSON.parse(localStorage.getItem('sonumCurrentUser'));
    
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

    renderWorkspaceLayout();
}

// Workspace Swapper: Switch perspectives dynamically for manual review
function initWorkspaceSwitchBtn() {
    const toggleBtn = document.getElementById('workspaceToggleBtn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const nextRole = sessionUser.userRole === 'client' ? 'talent' : 'client';
        sessionUser.userRole = nextRole;
        localStorage.setItem('sonumCurrentUser', JSON.stringify(sessionUser));
        
        // Update user state database
        const users = JSON.parse(localStorage.getItem('sonumUsers') || '{}');
        if (users[sessionUser.email]) {
            users[sessionUser.email].userRole = nextRole;
            localStorage.setItem('sonumUsers', JSON.stringify(users));
        }

        renderWorkspaceLayout();
        showFeedbackToast(`Switched to ${nextRole === 'client' ? 'Client' : 'Voice Actor'} Workspace.`, "success");
    });
}

function renderWorkspaceLayout() {
    const isClient = sessionUser.userRole === 'client';
    
    // Label updates
    document.getElementById('workspaceRoleLabel').textContent = isClient ? "Client / Hirer Workspace" : "Voice Actor Workspace";
    document.getElementById('welcomeTitle').textContent = `Welcome back, ${sessionUser.fullName}!`;
    document.getElementById('welcomeSubtitle').textContent = isClient 
        ? `Oversee your active castings and escrow payouts.` 
        : `You have earned $${(sessionUser.earnings || 0).toLocaleString()} this month`;

    // View panels toggling
    document.getElementById('talentWorkspaceSection').style.display = isClient ? 'none' : 'block';
    document.getElementById('clientWorkspaceSection').style.display = isClient ? 'block' : 'none';

    if (isClient) {
        populateClientWorkspace();
    } else {
        populateTalentWorkspace();
    }
}

// Client Dashboard Population
function populateClientWorkspace() {
    const projectsList = document.getElementById('clientActiveProjectsList');
    const rosterList = document.getElementById('savedRosterList');
    const logsList = document.getElementById('communicationLogsList');
    const releaseBtn = document.getElementById('releaseEscrowBtn');

    // 1. Load active projects
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

    // 2. Load saved talent favorites
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

    // 3. Load communication logs
    const logs = JSON.parse(localStorage.getItem('sonumCommLogs') || '[]');
    logsList.innerHTML = '';
    logs.forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = l;
        logsList.appendChild(li);
    });

    // 4. Billing escrow controls
    const isFunded = localStorage.getItem('sonumEscrowStatus') === 'funded';
    document.getElementById('billingEscrowHeld').textContent = isFunded ? '$1,000' : '$0';
    document.getElementById('billingPlatformFee').textContent = isFunded ? '$80' : '$0';

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
function populateTalentWorkspace() {
    document.getElementById('statProjects').textContent = sessionUser.projects || 0;
    document.getElementById('statHours').textContent = sessionUser.hours || 0;
    document.getElementById('statEarnings').textContent = `$${(sessionUser.earnings || 0).toLocaleString()}`;
    document.getElementById('statRating').textContent = (sessionUser.rating || 5.0).toFixed(1);

    // Profile settings populates
    document.getElementById('profileName').textContent = sessionUser.fullName;
    document.getElementById('profileSpecialty').textContent = sessionUser.specialty || "General Vocalist";
    document.getElementById('profileRating').textContent = (sessionUser.rating || 5.0).toFixed(1);
    document.getElementById('profileReviews').textContent = sessionUser.reviews || 0;
    document.getElementById('profileProjects').textContent = sessionUser.projects || 0;
    document.getElementById('profileBio').textContent = sessionUser.bio;

    // Attributes fields
    document.getElementById('profileAttrAge').textContent = sessionUser.age || "25-45";
    document.getElementById('profileAttrTone').textContent = sessionUser.tone || "Warm, confident";
    document.getElementById('profileAttrAccent').textContent = sessionUser.accent || "Neutral American";
    document.getElementById('profileAttrLang').textContent = sessionUser.lang || "English";
    
    // Gear fields
    document.getElementById('profileEquipMic').textContent = sessionUser.mic || "Neumann TLM 103";
    document.getElementById('profileEquipInterface').textContent = sessionUser.interface || "Apollo Twin Duo";
    document.getElementById('profileEquipRoom').textContent = sessionUser.room || "Treated Booth";
    document.getElementById('profileTurnaround').textContent = sessionUser.turnaround || "24 hours";

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
function initProfileEditor() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');
    const panel = document.getElementById('profileEditPanel');
    const form = document.getElementById('profileEditForm');

    if (!editBtn || !panel) return;

    editBtn.addEventListener('click', () => {
        panel.classList.add('active');
        
        // Populates edit inputs
        document.getElementById('edit-name').value = sessionUser.fullName;
        document.getElementById('edit-specialty').value = sessionUser.specialty || 'Commercial & Adverts';
        document.getElementById('edit-rate').value = 150; // Mock rate default
        document.getElementById('edit-turnaround').value = sessionUser.turnaround || '24 hours';
        document.getElementById('edit-age').value = sessionUser.age || '25-45';
        document.getElementById('edit-accent').value = sessionUser.accent || 'Neutral American';
        document.getElementById('edit-tone').value = sessionUser.tone || 'Warm, confident';
        document.getElementById('edit-lang').value = sessionUser.lang || 'English';
        document.getElementById('edit-mic').value = sessionUser.mic || 'Neumann TLM 103';
        document.getElementById('edit-interface').value = sessionUser.interface || 'Apollo Twin Duo';
        document.getElementById('edit-bio').value = sessionUser.bio || '';

        // Scroll to form smoothly
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

        // Save states
        window.authSystem.updateUserProfile(updated);
        sessionUser = { ...sessionUser, ...updated };

        panel.classList.remove('active');
        populateTalentWorkspace();
        showFeedbackToast("Studio profile details updated successfully.", "success");
    });
}

// Modal handling for Audio Demo upload
function initDemoUploadModal() {
    const openBtn = document.getElementById('uploadDemoActionBtn');
    const closeBtn = document.getElementById('closeDemoModalBtn');
    const overlay = document.getElementById('demoModalOverlay');
    const modal = document.getElementById('demoUploadModal');
    const form = document.getElementById('demoUploadForm');

    if (!openBtn || !modal) return;

    openBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    });

    const closeModal = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

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
