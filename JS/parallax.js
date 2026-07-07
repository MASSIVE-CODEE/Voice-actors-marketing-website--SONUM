// Parallax Reveal Animation

document.addEventListener('DOMContentLoaded', () => {
    initParallaxReveal();
});

function initParallaxReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select elements to parallax reveal
    const revealElements = document.querySelectorAll(
        '.talent-card-large, .card, .talent-card, .booking-card, .stat-card, .action-btn, .cta-section'
    );

    revealElements.forEach(element => {
        element.classList.add('reveal-element');
        observer.observe(element);
    });

    // Parallax effect on scroll
    window.addEventListener('scroll', () => {
        parallaxScroll();
    });
}

function parallaxScroll() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    parallaxElements.forEach(element => {
        const scrollPosition = window.pageYOffset;
        const elementOffset = element.offsetTop;
        const distance = scrollPosition - elementOffset;
        const yPos = distance * 0.5;
        
        element.style.transform = `translateY(${yPos}px)`;
    });
}

// Add parallax data attribute to hero sections
document.addEventListener('DOMContentLoaded', () => {
    const heroSections = document.querySelectorAll('.hero-image-container, .welcome-image, .hero-content');
    heroSections.forEach(section => {
        section.setAttribute('data-parallax', 'true');
    });
});
