/**
 * Mobile-specific optimizations for better performance and UX
 */

// Viewport meta tag for mobile optimization
export const setMobileViewport = () => {
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  } else {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.getElementsByTagName('head')[0].appendChild(meta);
  }
};

// Preconnect to Firebase services for faster loading
export const addPreconnects = () => {
  const preconnects = [
    'https://firestore.googleapis.com',
    'https://firebase.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com'
  ];

  preconnects.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// PWA-style meta tags for better mobile experience
export const addPWAMetaTags = () => {
  const metas = [
    { name: 'theme-color', content: '#2e7d32' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Business App' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'msapplication-TileColor', content: '#2e7d32' },
    { name: 'msapplication-tap-highlight', content: 'no' }
  ];

  metas.forEach(({ name, content }) => {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });
};

// Touch optimizations
export const optimizeTouchHandling = () => {
  // Prevent zoom on input focus (iOS Safari)
  const style = document.createElement('style');
  style.innerHTML = `
    @media screen and (-webkit-min-device-pixel-ratio: 0) {
      select:focus,
      textarea:focus,
      input:focus {
        font-size: 16px !important;
        transform: translateZ(0);
        -webkit-appearance: none;
        border-radius: 0;
      }
    }
    
    /* Improve scrolling performance */
    * {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    
    /* Remove tap highlights */
    * {
      -webkit-tap-highlight-color: transparent !important;
      -webkit-focus-ring-color: transparent !important;
      outline: none !important;
    }
    
    /* Optimize animations */
    * {
      will-change: auto;
    }
    
    /* Better font rendering on mobile */
    body {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
};

// Performance monitoring
export const monitorPerformance = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const metrics = {
          dns: perfData.domainLookupEnd - perfData.domainLookupStart,
          tcp: perfData.connectEnd - perfData.connectStart,
          ttfb: perfData.responseStart - perfData.requestStart,
          download: perfData.responseEnd - perfData.responseStart,
          domParsing: perfData.domContentLoadedEventEnd - perfData.responseEnd,
          totalLoad: perfData.loadEventEnd - perfData.fetchStart
        };
        
        console.log('📊 Mobile Performance Metrics:', metrics);
        
        // Report slow performance
        if (metrics.totalLoad > 3000) {
          console.warn('⚠️ Slow page load detected:', metrics.totalLoad + 'ms');
        }
      }, 0);
    });
  }
};

// Memory management
export const optimizeMemoryUsage = () => {
  // Clean up memory on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Force garbage collection (Chrome DevTools)
      if (window.gc) {
        window.gc();
      }
      
      // Clear console to free memory
      if (console.clear && process.env.NODE_ENV === 'production') {
        console.clear();
      }
    }
  });
  
  // Monitor memory usage
  if ('memory' in performance) {
    const checkMemory = () => {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024;
      const limit = memory.jsHeapSizeLimit / 1024 / 1024;
      
      console.log(`📱 Memory usage: ${used.toFixed(2)} MB / ${limit.toFixed(2)} MB`);
      
      if (used > limit * 0.8) {
        console.warn('⚠️ High memory usage detected');
      }
    };
    
    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
  }
};

// Network optimization
export const optimizeNetworking = () => {
  // Connection-aware loading
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    
    // Reduce quality on slow connections
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
      console.log('🐌 Slow connection detected, enabling optimizations');
      document.body.classList.add('slow-connection');
    }
    
    // Monitor connection changes
    connection.addEventListener('change', () => {
      console.log('📶 Connection changed:', connection.effectiveType);
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        document.body.classList.add('slow-connection');
      } else {
        document.body.classList.remove('slow-connection');
      }
    });
  }
};

// Battery optimization
export const optimizeForBattery = () => {
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      const handleBatteryChange = () => {
        if (battery.level < 0.2 || battery.charging === false) {
          console.log('🔋 Low battery detected, enabling power saving mode');
          document.body.classList.add('power-saving');
          
          // Reduce animations and transitions
          const style = document.createElement('style');
          style.id = 'power-saving-styles';
          style.innerHTML = `
            .power-saving * {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `;
          document.head.appendChild(style);
        } else {
          document.body.classList.remove('power-saving');
          const powerSavingStyles = document.getElementById('power-saving-styles');
          if (powerSavingStyles) {
            powerSavingStyles.remove();
          }
        }
      };
      
      battery.addEventListener('levelchange', handleBatteryChange);
      battery.addEventListener('chargingchange', handleBatteryChange);
      
      // Initial check
      handleBatteryChange();
    });
  }
};

// Initialize all mobile optimizations
export const initializeMobileOptimizations = () => {
  // Only run on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    console.log('🖥️ Desktop detected, skipping mobile optimizations');
    return;
  }
  
  console.log('📱 Initializing mobile optimizations...');
  
  try {
    setMobileViewport();
    addPreconnects();
    addPWAMetaTags();
    optimizeTouchHandling();
    monitorPerformance();
    optimizeMemoryUsage();
    optimizeNetworking();
    optimizeForBattery();
    
    console.log('✅ Mobile optimizations initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing mobile optimizations:', error);
  }
};

// Debounced resize handler for responsive optimizations
export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const handleResponsiveOptimizations = debounce(() => {
  // Update CSS custom properties based on viewport
  const vh = window.innerHeight * 0.01;
  const vw = window.innerWidth * 0.01;
  
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--vw', `${vw}px`);
  
  // Update mobile breakpoint class
  const isMobile = window.innerWidth < 768;
  document.body.classList.toggle('mobile-viewport', isMobile);
}, 100);

// Auto-initialize on DOM load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileOptimizations);
  } else {
    initializeMobileOptimizations();
  }
  
  // Handle resize events
  window.addEventListener('resize', handleResponsiveOptimizations);
  window.addEventListener('orientationchange', handleResponsiveOptimizations);
  
  // Initial responsive setup
  handleResponsiveOptimizations();
}