// Cache DOM elements
const DOMElements = {
    loader: document.querySelector('.preloader'),
    navbar: document.querySelector("nav"),
    scrollToTop: document.getElementById("scrollToTop"),
    cookieBanner: document.getElementById("cookieConsent"),
    cookieAcceptBtn: document.getElementById("acceptCookiesBtn"),
    sections: document.querySelectorAll("section"),
    hero: document.getElementById('hero'),
    lazyImages: document.querySelectorAll('[data-src]'),
    lazyBackgrounds: document.querySelectorAll('[data-bg]'),
    modalButtons: document.querySelectorAll('[data-bs-toggle="modal"]'),
    navigationLinks: document.querySelectorAll('a[href^="#"]'),
    mainContent: document.querySelector('main'),
    faqAccordion: document.querySelectorAll('.accordion-item'),
    faqCategories: document.querySelectorAll('.category-card'),
    relatedQuestions: document.querySelector('.related-questions')
};

// Enhanced utility functions
const utils = {
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    logWarning(message, error = null) {
        console.warn(`[La Aldea]: ${message}`, error ? error : '');
        if (error && error.stack) {
            console.debug('[La Aldea Debug]:', error.stack);
        }
    },

    safeExecute(fn, errorMessage) {
        try {
            return fn();
        } catch (error) {
            this.logWarning(errorMessage, error);
            return null;
        }
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    loadInteractiveMap() {
        const mapContainer = document.getElementById('mapContainer');
        const staticMap = mapContainer.querySelector('img');
        
        if (!mapContainer || !staticMap) return;
        
        const mapObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = document.createElement('iframe');
                    iframe.src = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3294.132426112131!2d-55.76619062561081!3d-34.347107643989176!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a06b0d701e68b7%3A0x5c6ea977f048f63!2sLa%20Aldea%20-%20Mart%C3%ADn%20Betancor%20Peregalli!5e0!3m2!1sen!2sus!4v1738039005938!5m2!1sen!2sus';
                    iframe.width = '100%';
                    iframe.height = '450';
                    iframe.style.border = '0';
                    iframe.allowFullscreen = true;
                    iframe.loading = 'lazy';
                    iframe.referrerPolicy = 'no-referrer-when-downgrade';
                    iframe.title = 'La Aldea Location Map';
                    
                    mapContainer.replaceChild(iframe, staticMap);
                    mapObserver.disconnect();
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '50px'
        });
        
        mapObserver.observe(mapContainer);
    }
};

const observerOptions = {
    threshold: [0, 0.5, 1.0],
    rootMargin: '50px',
};

// Enhanced lazy loading with separate observers - using arrow functions to preserve 'this' context
const lazyLoading = {
    imageObserver: null,
    backgroundObserver: null,
    iframeObserver: null,

    // Initialize observers with proper 'this' binding
    createObservers() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.handleImageLoad(img);
                }
            });
        }, observerOptions);

        this.backgroundObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    this.handleBackgroundLoad(el);
                }
            });
        }, { threshold: 0.1 });

        this.iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const iframe = entry.target;
                    this.handleIframeLoad(iframe);
                }
            });
        }, { 
            threshold: 0,
            rootMargin: '100px'
        });
    },

    handleImageLoad(img) {
        utils.safeExecute(() => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                if (this.imageObserver) {
                    this.imageObserver.unobserve(img);
                }
            }
        }, `Failed to load image: ${img.dataset.src}`);
    },

    handleBackgroundLoad(element) {
        utils.safeExecute(() => {
            if (element.dataset.bg) {
                element.style.backgroundImage = `url(${element.dataset.bg})`;
                if (this.backgroundObserver) {
                    this.backgroundObserver.unobserve(element);
                }
            }
        }, `Failed to load background: ${element.dataset.bg}`);
    },

    handleIframeLoad(iframe) {
        utils.safeExecute(() => {
            if (iframe.dataset.src) {
                iframe.src = iframe.dataset.src;
                if (this.iframeObserver) {
                    this.iframeObserver.unobserve(iframe);
                }
            }
        }, `Failed to load iframe: ${iframe.dataset.src}`);
    },

    init() {
        utils.safeExecute(() => {
            // Create observers with proper 'this' binding
            this.createObservers();
            
            // Native lazy loading check for images
            if (!('loading' in HTMLImageElement.prototype)) {
                DOMElements.lazyImages.forEach(img => this.imageObserver.observe(img));
            }
            
            // Background images
            DOMElements.lazyBackgrounds.forEach(el => this.backgroundObserver.observe(el));
            
            // Handle Google Maps iframe
            const mapIframe = document.querySelector('.map-container iframe');
            if (mapIframe) {
                // Load map immediately without lazy loading
                if (mapIframe.dataset.src) {
                    mapIframe.src = mapIframe.dataset.src;
                }
            }
        }, "Lazy loading initialization failed");
    },

    cleanup() {
        if (this.imageObserver) this.imageObserver.disconnect();
        if (this.backgroundObserver) this.backgroundObserver.disconnect();
        if (this.iframeObserver) this.iframeObserver.disconnect();
        DOMElements.sections.forEach(section => {
            section.removeAttribute('data-height-set');
        });
        window.removeEventListener('orientationchange', heightManager.handleOrientationChange);
        if (performance.marks) performance.marks.clear();
    }
};

// Scroll management
const scrollManager = {
    lastScroll: 0,
    ticking: false,

    init() {
        if (!DOMElements.navbar || !DOMElements.scrollToTop) {
            utils.logWarning("Required scroll elements not found");
            return;
        }

        // Replace the existing scroll listener with this optimized version
        window.addEventListener('scroll', 
            utils.throttle(() => {
                requestAnimationFrame(() => this.handleScroll());
            }, 50)
        );

        DOMElements.scrollToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        // Handle FAQ accordion open/close animations
        const accordionButtons = document.querySelectorAll('.accordion-button');
        accordionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const content = document.querySelector(this.getAttribute('data-bs-target'));
                if (content) {
                    // Scroll into view if needed
                    setTimeout(() => {
                        if (this.getAttribute('aria-expanded') === 'true') {
                            const navHeight = document.querySelector('nav').offsetHeight;
                            const topPosition = content.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                            window.scrollTo({
                                top: topPosition,
                                behavior: 'smooth'
                            });
                        }
                    }, 300);
                }
            });
        });
    },

    handleScroll() {
        const currentScroll = window.pageYOffset;
            
        // Update navbar
        DOMElements.navbar.classList.toggle("scrolled", currentScroll > 50);
        DOMElements.navbar.style.transform = currentScroll > this.lastScroll && currentScroll > 500 
            ? "translateY(-100%)" 
            : "translateY(0)";
        
        // Update scroll-to-top button with fade effect
        if (currentScroll > 300) {
            DOMElements.scrollToTop.style.display = "flex";
            setTimeout(() => DOMElements.scrollToTop.style.opacity = "1", 10);
        } else {
            DOMElements.scrollToTop.style.opacity = "0";
            setTimeout(() => DOMElements.scrollToTop.style.display = "none", 200);
        }
        
        this.lastScroll = currentScroll;
        this.ticking = false;
    }
};

// Height management
const heightManager = {
    setPageHeights() {
        const height = window.innerHeight;
        
        DOMElements.sections.forEach(section => {
            if (section.id === 'hero') {
                if (!section.hasAttribute('data-height-set')) {
                    section.style.height = `${height}px`;
                    section.setAttribute('data-height-set', 'true');
                }
            } else if (window.innerWidth <= 768) {
                section.style.minHeight = `${height}px`;
            } else {
                section.style.minHeight = '';
            }
        });
    },

    handleOrientationChange: utils.debounce(() => {
        if (DOMElements.hero) {
            DOMElements.hero.removeAttribute('data-height-set');
            setTimeout(() => heightManager.setPageHeights(), 100);
        }
    }, 250)
};

// Add navbar toggler handling
const navbarHandler = {
    init() {
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbar = document.querySelector('.navbar');
        
        if (!navbarToggler || !navbar) {
            utils.logWarning("Navbar toggler elements not found");
            return;
        }
        
        navbarToggler.addEventListener('click', function() {
            // Check if menu is being expanded or collapsed
            if (navbar.classList.contains('menu-open')) {
                navbar.classList.remove('menu-open');
            } else {
                navbar.classList.add('menu-open');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNavbar = navbar.contains(event.target);
            const navbarCollapse = navbar.querySelector('.navbar-collapse');
            
            if (navbarCollapse) {
                const isExpanded = navbarCollapse.classList.contains('show');
                
                if (!isClickInsideNavbar && isExpanded) {
                    navbarToggler.click();
                }
            }
        });
    }
};

// Main initialization with enhanced error handling
document.addEventListener("DOMContentLoaded", function() {
    // Critical initialization
    const criticalInit = () => {
        utils.safeExecute(() => {
            performanceMonitor.startTime = performance.now();
            performanceMonitor.markStart();
            performanceMonitor.measureLCP();

            // Initialize core functionality first
            heightManager.setPageHeights();
            scrollManager.init();
            navbarHandler.init(); // Initialize navbar toggler functionality

            // Handle loader immediately if document is ready
            if (DOMElements.loader) {
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    removeLoader();
                } else {
                    // Remove loader as soon as DOM is ready
                    document.addEventListener('DOMContentLoaded', removeLoader, { once: true });
                }
            }
        }, "Critical initialization failed");
    };

    // Add Performance Monitoring
    const performanceMonitor = {
        startTime: performance.now(),
        
        markStart() {
            performance.mark('pageStart');
        },
        
        measureLCP() {
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                utils.logWarning(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
            }).observe({ entryTypes: ['largest-contentful-paint'] });
        },
        
        logTiming(label) {
            const duration = performance.now() - this.startTime;
            utils.logWarning(`${label}: ${duration.toFixed(2)}ms`);
        }
    };

    // Add removeLoader helper function
    function removeLoader() {
        if (!DOMElements.loader) return;
    
        performanceMonitor.logTiming('Time to loader removal');
    
        // Remove loader immediately
        requestAnimationFrame(() => {
            DOMElements.loader.style.transition = 'opacity 0.1s';
            DOMElements.loader.style.opacity = '0';
            
            // Show main content immediately
            if (DOMElements.mainContent) {
                DOMElements.mainContent.style.visibility = 'visible';
            }
            
            // Remove loader after transition
            setTimeout(() => {
                DOMElements.loader.remove();
                performanceMonitor.logTiming('Total load time');
            }, 100); // Reduced from 300ms
        });
    }

    // Non-critical initialization
    const deferredInit = () => {
        utils.safeExecute(() => {
            lazyLoading.init();
            
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    once: true,
                    offset: 100
                });
            }
            analyticsLoader.init();
            utils.loadInteractiveMap();
            // Initialize smooth scrolling
            initializeSmoothScroll();
            initializeCookieConsent();
        }, "Deferred initialization failed");
    };

    // Execute critical operations immediately
    criticalInit();

    // Defer non-critical operations
    if (window.requestIdleCallback) {
        requestIdleCallback(deferredInit);
    } else {
        setTimeout(deferredInit, 1000);
    }

    // Event listeners
    window.addEventListener('orientationchange', heightManager.handleOrientationChange);

    // Enhanced cleanup
    return () => {
        utils.safeExecute(() => {
            lazyLoading.cleanup();
            // Add other cleanup tasks here
        }, "Cleanup failed");
    };
});

// Utility functions remain unchanged
function openContactForm(product) {
    document.querySelector('#message').value = `Consulta sobre: ${product}`;
    document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
}

function closeModalAndScroll(modalId) {
    const modal = document.getElementById(modalId);
    const bsModal = bootstrap.Modal.getInstance(modal);
    const navHeight = document.querySelector('nav').offsetHeight;
    
    bsModal.hide();
    
    // Wait for modal animation to complete before scrolling
    setTimeout(() => {
        const contactSection = document.querySelector('#contact');
        const targetPosition = contactSection.offsetTop - navHeight;
        
        window.scrollTo({
            top: targetPosition,
            behavior: "smooth"
        });
    }, 300); // Match Bootstrap's modal transition time
}

function initializeSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);
            const navHeight = document.querySelector('nav').offsetHeight;
            const targetPosition = targetElement.offsetTop - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: "smooth"
            });
        });
    });
}

function initializeCookieConsent() {
    if (cookieConsent && typeof cookieConsent.init === "function") {
        cookieConsent.init();
    }
}

const cookieConsent = {
    banner: DOMElements.cookieBanner,
    acceptButton: DOMElements.cookieAcceptBtn,
    
    init() {
        // Don't show banner if cookies already accepted
        if (localStorage.getItem('cookiesAccepted')) return;

        // Delay cookie banner display until after critical content
        if (window.requestIdleCallback) {
            requestIdleCallback(() => this.showBanner(), { timeout: 3000 });
        } else {
            setTimeout(() => this.showBanner(), 2000);
        }
    },

    showBanner() {
        if (!this.banner) return;

        // Set initial styles before showing
        this.banner.style.opacity = '0';
        this.banner.style.transform = 'translateY(100%)';
        this.banner.style.display = 'block';

        // Force browser reflow
        this.banner.offsetHeight;

        // Add transition and show
        requestAnimationFrame(() => {
            this.banner.style.transition = 'opacity 0.3s, transform 0.3s';
            this.banner.style.opacity = '1';
            this.banner.style.transform = 'translateY(0)';
        });

        // Add event listener
        this.acceptButton?.addEventListener('click', () => this.accept());
    },

    accept() {
        localStorage.setItem('cookiesAccepted', 'true');
        
        // Animate out
        this.banner.style.opacity = '0';
        this.banner.style.transform = 'translateY(100%)';
        
        setTimeout(() => {
            this.banner.style.display = 'none';
            this.banner.remove(); // Remove from DOM completely
        }, 300);
    }
};

// Service Worker Registration for PWA support
const serviceWorkerManager = {
    init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        console.log('[La Aldea] ServiceWorker registered:', registration.scope);
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[La Aldea] New content available, refresh to update');
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        console.warn('[La Aldea] ServiceWorker registration failed:', error);
                    });
            });
        }
    }
};

// Initialize service worker
serviceWorkerManager.init();
