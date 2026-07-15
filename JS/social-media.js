// Social Media Modal Functionality

let socialMediaController = null;

function initSocialMedia() {
    if (socialMediaController) return socialMediaController;

    const controller = {
        modalOpen: false,
        keydownHandler: null,
        scrollHandler: null
    };

    const socialButton = document.getElementById('socialMediaButton');
    const socialModal = document.getElementById('socialModal');
    const closeButton = document.querySelector('.social-modal-close');

    const closeSocialModal = () => {
        if (!socialModal) return;
        socialModal.classList.remove('active');
        document.body.style.overflow = '';
        controller.modalOpen = false;
    };

    if (socialButton && socialModal) {
        socialButton.addEventListener('click', () => {
            socialModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            controller.modalOpen = true;
        });

        if (closeButton) {
            closeButton.addEventListener('click', closeSocialModal);
        }

        socialModal.addEventListener('click', (event) => {
            if (event.target === socialModal) {
                closeSocialModal();
            }
        });

        controller.keydownHandler = (event) => {
            if (event.key === 'Escape' && controller.modalOpen) {
                closeSocialModal();
            }
        };
        document.addEventListener('keydown', controller.keydownHandler);
    }

    document.querySelectorAll('.social-link').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (link.getAttribute('href') === '#') {
                event.preventDefault();
                const platform = link.dataset.platform;
                const handle = link.dataset.handle;
                handleSocialClick(platform, handle);
            }
        });
    });

    controller.scrollHandler = () => {
        if (socialButton) {
            if (window.scrollY > 300) {
                socialButton.classList.add('is-visible');
            } else {
                socialButton.classList.remove('is-visible');
            }
        }
    };
    window.addEventListener('scroll', controller.scrollHandler, { passive: true });

    socialMediaController = controller;
    return controller;
}

document.addEventListener('DOMContentLoaded', () => {
    initSocialMedia();
});

function closeSocialModal() {
    const socialModal = document.getElementById('socialModal');
    if (socialModal) {
        socialModal.classList.remove('active');
    }
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
