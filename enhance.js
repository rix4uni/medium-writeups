// Enhancement script to improve the dashboard appearance and functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Cybersecurity Dashboard Enhanced');
    
    // Add enhanced category colors with better visual hierarchy
    const enhancedCategoryColors = {
        'Core Security': '#FF6B6B',
        'Bug Bounty': '#4ECDC4', 
        'Penetration Testing': '#45B7D1',
        'Web Security': '#96CEB4',
        'API & Mobile': '#FFEAA7',
        'Cloud Security': '#DDA0DD',
        'Tools & OSINT': '#74B9FF',
        'Security Tools': '#A29BFE',
        'Malware & Threats': '#FD79A8',
        'Forensics & IR': '#FDCB6E',
        'Crypto & Privacy': '#E17055',
        'Network Security': '#00B894',
        'Vuln Research': '#6C5CE7',
        'Blue Team & SOC': '#00CEC9',
        'Compliance & Governance': '#FD79A8',
        'AI/ML Security': '#FF6B9D',
        'IoT & Hardware': '#4ECDC4',
        'DevSecOps & CI/CD': '#96CEB4',
        'Social Engineering': '#FF9F43',
        'Zero Trust & Modern Architecture': '#A55EEA',
        'Threat Intelligence': '#26D0CE',
        'Privacy & Data Protection': '#FD79A8',
        'Quantum & Post-Quantum': '#6C5CE7',
        'Specialized Security': '#00B894',
        'Bug Bounty Platforms': '#E17055'
    };
    
    // Add visual enhancements
    addVisualEnhancements();
    addKeyboardShortcuts();
    addProgressIndicators();
    
    function addVisualEnhancements() {
        // Add floating particles effect to header
        const header = document.querySelector('header');
        if (header) {
            createFloatingParticles(header);
        }
        
        // Add smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';
        
        // Add loading animations
        const cards = document.querySelectorAll('.post-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-fade-in-up');
        });
    }
    
    function createFloatingParticles(container) {
        const particleCount = 15;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                animation: float-${i % 3} ${3 + Math.random() * 4}s infinite;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
            `;
            container.appendChild(particle);
        }
        
        // Add particle animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float-0 {
                0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 1; }
                50% { transform: translateY(-20px) rotate(180deg); opacity: 0.5; }
            }
            @keyframes float-1 {
                0%, 100% { transform: translateX(0px) rotate(0deg); opacity: 0.8; }
                50% { transform: translateX(20px) rotate(180deg); opacity: 0.3; }
            }
            @keyframes float-2 {
                0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
                50% { transform: translateY(-15px) translateX(-15px); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    function addKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // ESC to close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('[x-show="showSettings"], [x-show="showAnalytics"]');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none') {
                        const alpineData = Alpine.$data(modal);
                        if (alpineData) {
                            alpineData.showSettings = false;
                            alpineData.showAnalytics = false;
                        }
                    }
                });
            }
            
            // Ctrl+K for search focus
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.focus();
            }
            
            // F for full-screen toggle
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                toggleFullscreen();
            }
        });
    }
    
    function addProgressIndicators() {
        // Add scroll progress indicator
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            z-index: 9999;
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);
        
        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            progressBar.style.width = `${scrollPercent}%`;
        });
    }
    
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen().catch(console.error);
        }
    }
    
    // Add notification system
    window.showNotification = function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            background: ${type === 'success' ? '#4ECDC4' : type === 'error' ? '#FF6B6B' : '#667eea'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
    
    // Enhanced theme switching with smooth transitions
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                showNotification(`Switched to ${document.documentElement.dataset.theme} theme`, 'success');
            }
        });
    });
    
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
    
    console.log('✅ Dashboard enhancements loaded successfully');
});