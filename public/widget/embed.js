(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.SunstoneWidgetInitialized) return;
  window.SunstoneWidgetInitialized = true;
  
  // Configuration from script initialization
  const scriptTag = document.currentScript;
  const config = window.ssWidget || {};
  
  // Widget state
  let widgetFrame = null;
  let widgetButton = null;
  let isOpen = false;
  let widgetSettings = null;
  
  // Extract business ID from script src
  const scriptSrc = scriptTag ? scriptTag.src : '';
  const businessIdMatch = scriptSrc.match(/\/widget\/([^\/]+)\/embed\.js/);
  const businessId = config.businessId || (businessIdMatch ? businessIdMatch[1] : null);
  
  if (!businessId) {
    console.error('Sunstone Widget: Business ID not found');
    return;
  }
  
  // Widget styles
  const styles = `
    .sunstone-widget-button {
      position: fixed;
      z-index: 99998;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      border: none;
      outline: none;
    }
    
    .sunstone-widget-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .sunstone-widget-button.bottom-right {
      bottom: 20px;
      right: 20px;
    }
    
    .sunstone-widget-button.bottom-left {
      bottom: 20px;
      left: 20px;
    }
    
    .sunstone-widget-button.top-right {
      top: 20px;
      right: 20px;
    }
    
    .sunstone-widget-button.top-left {
      top: 20px;
      left: 20px;
    }
    
    .sunstone-widget-icon {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    .sunstone-widget-container {
      position: fixed;
      z-index: 99999;
      width: 400px;
      height: 600px;
      max-width: 100vw;
      max-height: 100vh;
      border: none;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      background: white;
    }
    
    .sunstone-widget-container.hidden {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.9) translateY(20px);
    }
    
    .sunstone-widget-container.bottom-right {
      bottom: 90px;
      right: 20px;
    }
    
    .sunstone-widget-container.bottom-left {
      bottom: 90px;
      left: 20px;
    }
    
    .sunstone-widget-container.top-right {
      top: 90px;
      right: 20px;
    }
    
    .sunstone-widget-container.top-left {
      top: 90px;
      left: 20px;
    }
    
    @media (max-width: 480px) {
      .sunstone-widget-container {
        width: 100vw;
        height: 100vh;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: 0 !important;
        border-radius: 0;
      }
      
      .sunstone-widget-button {
        width: 56px;
        height: 56px;
      }
    }
    
    .sunstone-widget-close {
      position: absolute;
      top: -40px;
      right: 0;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    
    .sunstone-widget-close:hover {
      background: rgba(0, 0, 0, 0.8);
    }
    
    .sunstone-widget-close svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
  `;
  
  // Load widget configuration
  async function loadWidgetConfig() {
    try {
      const response = await fetch(`/api/widget/config?businessId=${businessId}`);
      if (!response.ok) {
        throw new Error('Failed to load widget configuration');
      }
      const data = await response.json();
      widgetSettings = data.settings;
      return data;
    } catch (error) {
      console.error('Sunstone Widget: Failed to load configuration', error);
      return null;
    }
  }
  
  // Create widget button
  function createWidgetButton() {
    const button = document.createElement('button');
    button.className = `sunstone-widget-button ${widgetSettings.position || 'bottom-right'}`;
    button.style.backgroundColor = widgetSettings.primaryColor || '#00A651';
    button.setAttribute('aria-label', 'Open property measurement widget');
    
    // Add icon
    button.innerHTML = `
      <svg class="sunstone-widget-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2M12 4.18L20 8.36V12C20 15.81 18.05 19.35 15.07 21.57L12 22.31L8.93 21.57C5.95 19.35 4 15.81 4 12V8.36L12 4.18M12 7C10.34 7 9 8.34 9 10C9 11.66 10.34 13 12 13C13.66 13 15 11.66 15 10C15 8.34 13.66 7 12 7M12 15C10 15 8 16 8 17V18H16V17C16 16 14 15 12 15Z"/>
      </svg>
    `;
    
    button.addEventListener('click', toggleWidget);
    
    return button;
  }
  
  // Create widget iframe
  function createWidgetFrame() {
    const container = document.createElement('div');
    container.className = `sunstone-widget-container ${widgetSettings.position || 'bottom-right'} hidden`;
    
    // Add close button for mobile
    const closeButton = document.createElement('button');
    closeButton.className = 'sunstone-widget-close';
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    closeButton.addEventListener('click', closeWidget);
    
    const iframe = document.createElement('iframe');
    iframe.src = `/widget/${businessId}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'inherit';
    iframe.setAttribute('title', 'Property Measurement Widget');
    
    container.appendChild(closeButton);
    container.appendChild(iframe);
    
    // Listen for messages from iframe
    window.addEventListener('message', handleIframeMessage);
    
    return container;
  }
  
  // Handle messages from iframe
  function handleIframeMessage(event) {
    // Verify origin
    if (!event.origin.includes(window.location.hostname) && 
        !event.origin.includes('localhost')) {
      return;
    }
    
    const { type, data } = event.data || {};
    
    switch(type) {
      case 'widget:close':
        closeWidget();
        break;
      case 'widget:resize':
        if (data && data.height) {
          widgetFrame.style.height = `${data.height}px`;
        }
        break;
      case 'widget:complete':
        // Handle completion event
        if (window.ssWidgetCallback) {
          window.ssWidgetCallback('complete', data);
        }
        break;
    }
  }
  
  // Toggle widget visibility
  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }
  
  // Open widget
  function openWidget() {
    if (!widgetFrame) return;
    
    widgetFrame.classList.remove('hidden');
    isOpen = true;
    
    // Track opening event
    if (widgetSettings.enableAnalytics) {
      trackEvent('widget_opened');
    }
    
    // Callback
    if (window.ssWidgetCallback) {
      window.ssWidgetCallback('open');
    }
  }
  
  // Close widget
  function closeWidget() {
    if (!widgetFrame) return;
    
    widgetFrame.classList.add('hidden');
    isOpen = false;
    
    // Track closing event
    if (widgetSettings.enableAnalytics) {
      trackEvent('widget_closed');
    }
    
    // Callback
    if (window.ssWidgetCallback) {
      window.ssWidgetCallback('close');
    }
  }
  
  // Track analytics events
  function trackEvent(eventName, eventData = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'Widget',
        event_label: businessId,
        ...eventData
      });
    }
    
    // Custom tracking
    if (widgetSettings.trackingId) {
      // Implement custom tracking here
    }
  }
  
  // Handle trigger events
  function setupTriggers() {
    const trigger = widgetSettings.triggerOn || 'click';
    
    switch(trigger) {
      case 'pageLoad':
        setTimeout(() => {
          openWidget();
        }, widgetSettings.delay || 0);
        break;
        
      case 'scroll':
        let scrollTriggered = false;
        window.addEventListener('scroll', () => {
          if (scrollTriggered) return;
          
          const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          if (scrollPercentage >= (widgetSettings.scrollPercentage || 50)) {
            scrollTriggered = true;
            openWidget();
          }
        });
        break;
        
      case 'exitIntent':
        let exitIntentTriggered = false;
        document.addEventListener('mouseout', (e) => {
          if (exitIntentTriggered) return;
          
          if (e.clientY <= (widgetSettings.exitIntentSensitivity || 20) && 
              e.relatedTarget === null) {
            exitIntentTriggered = true;
            openWidget();
          }
        });
        break;
        
      case 'timer':
        setTimeout(() => {
          openWidget();
        }, (widgetSettings.delay || 30) * 1000);
        break;
    }
  }
  
  // Add styles to page
  function addStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    
    // Add custom CSS if provided
    if (widgetSettings.customCss) {
      styleSheet.textContent += widgetSettings.customCss;
    }
    
    document.head.appendChild(styleSheet);
  }
  
  // Initialize widget
  async function init() {
    // Load configuration
    const configData = await loadWidgetConfig();
    if (!configData) {
      console.error('Sunstone Widget: Failed to initialize');
      return;
    }
    
    // Check if widget is active
    if (!widgetSettings.isActive) {
      console.log('Sunstone Widget: Widget is not active');
      return;
    }
    
    // Add styles
    addStyles();
    
    // Create widget elements
    widgetButton = createWidgetButton();
    widgetFrame = createWidgetFrame();
    
    // Add to page
    document.body.appendChild(widgetButton);
    document.body.appendChild(widgetFrame);
    
    // Setup triggers
    setupTriggers();
    
    // Auto-open if configured
    if (widgetSettings.autoOpen) {
      setTimeout(() => {
        openWidget();
      }, widgetSettings.delay || 0);
    }
    
    // Track page view
    if (widgetSettings.enableAnalytics) {
      trackEvent('widget_loaded');
    }
  }
  
  // Public API
  window.ssWidget = function(action, data) {
    switch(action) {
      case 'init':
        Object.assign(config, data);
        break;
      case 'open':
        openWidget();
        break;
      case 'close':
        closeWidget();
        break;
      case 'toggle':
        toggleWidget();
        break;
      case 'destroy':
        if (widgetButton) widgetButton.remove();
        if (widgetFrame) widgetFrame.remove();
        break;
    }
  };
  
  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();