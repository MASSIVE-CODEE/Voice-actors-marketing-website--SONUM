// Social Media Modal Functionality

document.addEventListener('DOMContentLoaded', () => {
    initSocialMedia();
});

function initSocialMedia() {
    const socialButton = document.getElementById('socialMediaButton');
    const socialModal = document.getElementById('socialModal');
    const closeButton = document.querySelector('.social-modal-close');

    if (socialButton && socialModal) {
        socialButton.addEventListener('click', () => {
            socialModal.classList.add('active');
        });

        closeButton.addEventListener('click', closeSocialModal);

        socialModal.addEventListener('click', (e) => {
            if (e.target === socialModal) {
                closeSocialModal();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && socialModal.classList.contains('active')) {
                closeSocialModal();
            }
        });
    }
    
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.href && link.href !== '#') {
                e.preventDefault();
                const platform = link.dataset.platform;
                const handle = link.dataset.handle;
                handleSocialClick(platform, handle);
            }
        });
    });
}

function closeSocialModal() {
    const socialModal = document.getElementById('socialModal');
    socialModal.classList.remove('active');
}

function handleSocialClick(platform, handle) {
    const socialUrls = {
        twitter: `https://twitter.com/${handle}`,
        instagram: `https://instagram.com/${handle}`,
        facebook: `https://facebook.com/${handle}`
    };

    if (socialUrls[platform]) {
        window.open(socialUrls[platform], '_blank', 'noopener,noreferrer');
    }
}

// Optional: Add scroll reveal animation to social button
window.addEventListener('scroll', () => {
    const socialButton = document.getElementById('socialMediaButton');
    if (socialButton) {
        if (window.scrollY > 300) {
            socialButton.style.opacity = '1';
            socialButton.style.pointerEvents = 'auto';
        } else {
            socialButton.style.opacity = '0.5';
            socialButton.style.pointerEvents = 'none';
        }
    }
});
// Optimized Social Media Modal Interactions

document.addEventListener('DOMContentLoaded', () => {
    initSocialMedia();
});

function initSocialMedia() {
    const socialButton = document.getElementById('socialMediaButton');
    const socialModal = document.getElementById('socialModal');
    const closeButton = document.querySelector('.social-modal-close');

    if (socialButton && socialModal) {
        // Open Modal Execution
        socialButton.addEventListener('click', () => {
            socialModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevents background layout scrolling
        });

        // Combined Close Actions
        const closeSocialModal = () => {
            socialModal.classList.remove('active');
            document.body.style.overflow = ''; // Restores window viewport interaction
        };

        if (closeButton) {
            closeButton.addEventListener('click', closeSocialModal);
        }

        socialModal.addEventListener('click', (e) => {
            if (e.target === socialModal) {
                closeSocialModal();
            }
        });

        // Safe global keyboard hook configuration
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && socialModal.classList.contains('active')) {
                closeSocialModal();
            }
        });
    }

    // Dynamic Social Platform Link Redirection Matrix
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href') === '#') {
                e.preventDefault();
                const platform = link.dataset.platform;
                const handle = link.dataset.handle;
                
                const socialUrls = {
                    twitter: `https://twitter.com/${handle}`,
                    instagram: `https://instagram.com/${handle}`,
                    facebook: `https://facebook.com/${handle}`
                };

                if (socialUrls[platform]) {
                    window.open(socialUrls[platform], '_blank', 'noopener,noreferrer');
                }
            }
        });
    });

    // High Performance Passive Scroll Observer Class Binding
    window.addEventListener('scroll', () => {
        if (socialButton) {
            if (window.scrollY > 300) {
                socialButton.classList.add('is-visible');
            } else {
                socialButton.classList.remove('is-visible');
            }
        }
    }, { passive: true });
}