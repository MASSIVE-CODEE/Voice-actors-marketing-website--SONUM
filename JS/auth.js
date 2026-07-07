// Authentication System for SONUM
// Handles registration role scopes, login session states, and Supabase integration patterns

class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('sonumUsers')) || {};
        this.currentUser = JSON.parse(localStorage.getItem('sonumCurrentUser')) || null;
        this.initDefaultUsers();
    }

    // Initialize mock database seeds to make testing instantly active
    initDefaultUsers() {
        const seedEmail = "actor@sonum.io";
        if (!this.users[seedEmail]) {
            this.users[seedEmail] = {
                fullName: "Jessica Wong",
                email: seedEmail,
                password: "password",
                userRole: "talent",
                specialty: "Commercial & Adverts",
                company: "",
                joinDate: new Date().toISOString(),
                rating: 4.9,
                reviews: 12,
                projects: 5,
                earnings: 3250,
                hours: 48,
                turnaround: "18 hours",
                age: "25-40",
                accent: "Neutral Mandarin / US",
                tone: "Friendly, conversational, bright",
                lang: "English, Mandarin",
                mic: "Shure SM7B",
                interface: "Focusrite Scarlett",
                room: "Treated Vocal Booth",
                bio: "Welcome to SONUM! Conversational commercial specialist and podcast host. Fluent bilingual reads in English and Mandarin, perfect for international campaigns."
            };
            localStorage.setItem('sonumUsers', JSON.stringify(this.users));
        }

        const seedClient = "client@sonum.io";
        if (!this.users[seedClient]) {
            this.users[seedClient] = {
                fullName: "Alex Reed",
                email: seedClient,
                password: "password",
                userRole: "client",
                specialty: "",
                company: "Fintech Launch Systems",
                joinDate: new Date().toISOString(),
                rating: 5.0,
                reviews: 0,
                projects: 2,
                earnings: 0,
                hours: 0,
                bio: "Casting Director at Fintech Launch Systems."
            };
            localStorage.setItem('sonumUsers', JSON.stringify(this.users));
        }
    }

    // SUPABASE INTEGRATION BLUEPRINT:
    // Below patterns illustrate how Supabase is integrated as the primary auth/database client.
    // If supabase instance is initialized, these calls are executed, falling back to local database.
    /*
    async signUpWithSupabase(email, password, metadata) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    fullName: metadata.fullName,
                    userRole: metadata.userRole,
                    specialty: metadata.specialty,
                    company: metadata.company
                }
            }
        });
        if (error) throw error;
        return data;
    }
    */

    signUp(fullName, email, password, role, detailField) {
        const normalizedEmail = email.trim().toLowerCase();

        if (this.users[normalizedEmail]) {
            return { success: false, message: 'Email address already registered.' };
        }

        const userData = {
            fullName: fullName.trim(),
            email: normalizedEmail,
            password, 
            userRole: role, // 'talent' or 'client'
            specialty: role === 'talent' ? detailField : '',
            company: role === 'client' ? detailField : '',
            joinDate: new Date().toISOString(),
            rating: 5.0,
            reviews: 0,
            projects: 0,
            earnings: 0,
            hours: 0,
            turnaround: "24 hours",
            age: "25-45",
            accent: "Neutral American",
            tone: "Warm, confident, corporate",
            lang: "English",
            mic: "Neumann TLM 103",
            interface: "Apollo Twin Duo",
            room: "Home Studio Booth",
            bio: `Studio profile for ${fullName.trim()}. Experienced voice actor ready for bookings.`
        };

        // Save locally
        this.users[normalizedEmail] = userData;
        localStorage.setItem('sonumUsers', JSON.stringify(this.users));
        
        // Log in session
        this.currentUser = { ...userData };
        localStorage.setItem('sonumCurrentUser', JSON.stringify(this.currentUser));

        return { success: true, message: 'Account created successfully!', user: this.currentUser };
    }

    signIn(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = this.users[normalizedEmail];

        if (!user) {
            return { success: false, message: 'Email address not found.' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Incorrect credentials. Try again.' };
        }

        this.currentUser = { ...user };
        localStorage.setItem('sonumCurrentUser', JSON.stringify(this.currentUser));

        return { success: true, message: 'Welcome back, sign in successful!', user: this.currentUser };
    }

    getCurrentUser() {
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('sonumCurrentUser');
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Updates profile details for active talent
    updateUserProfile(updatedData) {
        if (!this.currentUser) return;
        
        const email = this.currentUser.email;
        this.currentUser = { ...this.currentUser, ...updatedData };
        this.users[email] = { ...this.users[email], ...updatedData };
        
        localStorage.setItem('sonumCurrentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('sonumUsers', JSON.stringify(this.users));
    }
}

// Global initialization
const authSystem = new AuthSystem();
window.authSystem = authSystem;

document.addEventListener('DOMContentLoaded', () => {
    initAuthModalControls();
    updateHeaderNavigation();
});

function initAuthModalControls() {
    const modal = document.getElementById('authModal');
    const triggers = document.querySelectorAll('[data-auth-trigger]');
    const closeBtn = document.querySelector('.modal-close');
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const signinTabBtn = document.querySelector('[data-tab="signin"]');
    const signupTabBtn = document.querySelector('[data-tab="signup"]');
    
    // SignUp Form Field Switching: Client vs Voice Actor inputs
    const roleSelect = document.getElementById('signup-role');
    const specialtyGroup = document.getElementById('signup-specialty-group');
    const companyGroup = document.getElementById('signup-company-group');

    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            if (roleSelect.value === 'talent') {
                specialtyGroup.style.display = 'block';
                companyGroup.style.display = 'none';
            } else {
                specialtyGroup.style.display = 'none';
                companyGroup.style.display = 'block';
            }
        });
    }

    // Modal triggering
    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (authSystem.isLoggedIn()) {
                window.location.assign('dashboard.html');
            } else {
                openAuthOverlay(trigger.dataset.authMode || 'signin');
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeAuthOverlay);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthOverlay();
        });
    }

    // Tab toggles
    if (signinTabBtn) {
        signinTabBtn.addEventListener('click', () => toggleAuthTabs('signin'));
    }
    if (signupTabBtn) {
        signupTabBtn.addEventListener('click', () => toggleAuthTabs('signup'));
    }

    // SignIn Form submit
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            const res = authSystem.signIn(email, password);
            if (res.success) {
                renderFeedback(res.message, 'success');
                setTimeout(() => {
                    closeAuthOverlay();
                    window.location.assign('dashboard.html');
                }, 1000);
            } else {
                renderFeedback(res.message, 'error');
            }
        });
    }

    // SignUp Form submit
    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const role = roleSelect.value;
            
            const detailField = role === 'talent' 
                ? document.getElementById('signup-specialty').value 
                : document.getElementById('signup-company').value;

            const res = authSystem.signUp(name, email, password, role, detailField);
            if (res.success) {
                renderFeedback(res.message, 'success');
                setTimeout(() => {
                    closeAuthOverlay();
                    window.location.assign('dashboard.html');
                }, 1000);
            } else {
                renderFeedback(res.message, 'error');
            }
        });
    }
}

function openAuthOverlay(mode = 'signin') {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    toggleAuthTabs(mode);
    modal.classList.add('active');
}

function closeAuthOverlay() {
    document.getElementById('authModal')?.classList.remove('active');
}

function toggleAuthTabs(mode) {
    const isSignup = mode === 'signup';
    const formToActivate = isSignup ? 'signUpForm' : 'signInForm';
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === mode);
        btn.setAttribute('aria-selected', btn.dataset.tab === mode ? 'true' : 'false');
    });

    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.toggle('active', form.id === formToActivate);
    });
}

function renderFeedback(msg, type) {
    const container = document.createElement('div');
    container.className = `auth-message ${type}`;
    container.textContent = msg;
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 2500);
}

function updateHeaderNavigation() {
    const navSignBtn = document.querySelector('header .nav .btn.secondary-btn');
    if (authSystem.isLoggedIn() && navSignBtn) {
        navSignBtn.textContent = "Workspace";
        navSignBtn.href = "dashboard.html";
        navSignBtn.removeAttribute('data-auth-trigger');
    }
}
