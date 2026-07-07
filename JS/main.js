// SONUM - Main JavaScript File
// Handles general visual enhancements and micro-interactions

document.addEventListener('DOMContentLoaded', () => {
    initNavigationObserver();
    initSmoothScrolling();
    initBtnHoverFeedback();
    initDynamicTypingText();
});

// Navigation Link Observer: Sets active states on navigation links as user scrolls sections
function initNavigationObserver() {
    const navLinks = document.querySelectorAll('.nav a');
    const sections = document.querySelectorAll('main, section');
    
    if (navLinks.length === 0 || sections.length === 0) return;

    const observerOptions = {
        root: null,
        rootMargin: '-30% 0px -60% 0px', // Trigger activation near viewport center
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href.includes(sectionId)) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        if (section.getAttribute('id')) {
            observer.observe(section);
        }
    });
}

// Smooth scroll implementation with header height offset
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href.startsWith('#')) return;
            
            e.preventDefault();
            const targetId = href.substring(1);
            const target = document.getElementById(targetId);
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Button scale press feedback and dynamic hover shadow offsets
function initBtnHoverFeedback() {
    const buttons = document.querySelectorAll('.btn, .action-btn, .play-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.97)';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.transform = '';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    });
}

// JavaScript Typing Animation: types out key categories in a looping visual cycle
function initDynamicTypingText() {
    const typingElement = document.querySelector('.typing-text');
    if (!typingElement) return;
    
    const words = [
        "Commercial Campaigns",
        "Video Game Characters",
        "Audiobook Narrations",
        "Corporate E-Learning",
        "Cinema Trailers"
    ];
    
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    
    function typeEffect() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            // Removing characters
            typingElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50; // Deletes faster
        } else {
            // Typing characters
            typingElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100; // Normal typing speed
        }
        
        // Loop conditions
        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typingSpeed = 2000; // Wait 2s before deleting
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typingSpeed = 500; // Pause 0.5s before next word
        }
        
        setTimeout(typeEffect, typingSpeed);
    }
    
    // Start typing loop
    setTimeout(typeEffect, 1000);
}
