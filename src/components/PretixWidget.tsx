import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    PretixWidget?: {
      buildWidgets: () => void;
    };
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "pretix-widget": {
        event: string;
        subevent?: string;
        "list-type"?: string;
        "skip-ssl-check"?: string;
        "disable-iframe"?: string;
      };
    }
  }
}

const loadedResources = new Set<string>();
const resourceLoadingPromises = new Map<string, Promise<void>>();

function isValidPretixUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol || !urlObj.hostname) return false;
    return urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

function generateCssUrl(eventUrl: string): string {
  try {
    new URL(eventUrl);
    return `${eventUrl}widget/v2.css`;
  } catch {
    return "";
  }
}

function generateJsUrl(eventUrl: string): string {
  try {
    const urlObj = new URL(eventUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    return `${baseUrl}/widget/v2.en.js`;
  } catch {
    return "";
  }
}

function loadCssResource(cssUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (loadedResources.has(cssUrl)) {
      resolve();
      return;
    }
    if (resourceLoadingPromises.has(cssUrl)) {
      resourceLoadingPromises.get(cssUrl)!.then(resolve).catch(reject);
      return;
    }
    const promise = new Promise<void>((resolveLoad, rejectLoad) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      link.crossOrigin = "anonymous";
      link.onload = () => {
        loadedResources.add(cssUrl);
        resourceLoadingPromises.delete(cssUrl);
        resolveLoad();
      };
      link.onerror = () => {
        resourceLoadingPromises.delete(cssUrl);
        rejectLoad(new Error(`Failed to load CSS: ${cssUrl}`));
      };
      document.head.appendChild(link);
    });
    resourceLoadingPromises.set(cssUrl, promise);
    promise.then(resolve).catch(reject);
  });
}

function loadJsResource(jsUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (loadedResources.has(jsUrl)) {
      resolve();
      return;
    }
    if (resourceLoadingPromises.has(jsUrl)) {
      resourceLoadingPromises.get(jsUrl)!.then(resolve).catch(reject);
      return;
    }
    const promise = new Promise<void>((resolveLoad, rejectLoad) => {
      const script = document.createElement("script");
      script.src = jsUrl;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        loadedResources.add(jsUrl);
        resourceLoadingPromises.delete(jsUrl);
        resolveLoad();
      };
      script.onerror = () => {
        resourceLoadingPromises.delete(jsUrl);
        rejectLoad(new Error(`Failed to load JavaScript: ${jsUrl}`));
      };
      document.head.appendChild(script);
    });
    resourceLoadingPromises.set(jsUrl, promise);
    promise.then(resolve).catch(reject);
  });
}

function validatePretixUrl(url: string): { isValid: boolean; errorMessage?: string } {
  if (!url || typeof url !== "string") {
    return { isValid: false, errorMessage: "Event URL is required" };
  }
  if (url.trim().length === 0) {
    return { isValid: false, errorMessage: "Event URL cannot be empty" };
  }
  if (!isValidPretixUrl(url)) {
    return { isValid: false, errorMessage: "Invalid Pretix URL format" };
  }
  return { isValid: true };
}

export interface PretixWidgetProps {
  eventUrl: string;
  subevent?: string;
  listType?: "list" | "calendar" | "week";
  skipSslCheck?: boolean;
  disableIframe?: boolean;
  className?: string;
}

interface WidgetState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  resourcesLoaded: boolean;
}

export function PretixWidget({
  eventUrl,
  subevent,
  listType,
  skipSslCheck = import.meta.env.DEV,
  disableIframe = false,
  className = "",
}: PretixWidgetProps) {
  const [state, setState] = useState<WidgetState>({
    isLoading: true,
    hasError: false,
    resourcesLoaded: false,
  });

  const [showTimeoutHelper, setShowTimeoutHelper] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.isLoading) {
      setShowTimeoutHelper(false);
      return;
    }
    const timer = setTimeout(() => setShowTimeoutHelper(true), 7000);
    return () => clearTimeout(timer);
  }, [state.isLoading]);

  useEffect(() => {
    const validation = validatePretixUrl(eventUrl);
    if (!validation.isValid) {
      setState({
        isLoading: false,
        hasError: true,
        errorMessage: validation.errorMessage,
        resourcesLoaded: false,
      });
      return;
    }

    const loadResources = async () => {
      try {
        const cssUrl = generateCssUrl(eventUrl);
        const jsUrl = generateJsUrl(eventUrl);
        if (!cssUrl || !jsUrl) throw new Error("Failed to generate URLs");

        await Promise.all([loadCssResource(cssUrl), loadJsResource(jsUrl)]);
        setState({
          isLoading: false,
          hasError: false,
          resourcesLoaded: true,
        });
      } catch (error) {
        setState({
          isLoading: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : "Failed to load resources",
          resourcesLoaded: false,
        });
      }
    };

    loadResources();
  }, [eventUrl]);

  useEffect(() => {
    if (state.resourcesLoaded && containerRef.current) {
      if (window.PretixWidget) {
        window.PretixWidget.buildWidgets();
      }
    }
  }, [state.resourcesLoaded]);

  // Handle styles injection and broken image fixes
  useEffect(() => {
    if (!state.resourcesLoaded || !containerRef.current) return;

    let baseUrl = "";
    try {
      const urlObj = new URL(eventUrl);
      baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return;
    }

    const injectStyles = (root: ShadowRoot | Document | HTMLElement) => {
      if (root.querySelector("#pretix-dark-override")) return;

      const style = document.createElement("style");
      style.id = "pretix-dark-override";
      style.textContent = `
        :host {
          --pretix-brand-color: #ff9900 !important;
        }

        .pretix-widget {
          background: transparent !important;
          color: #f8fafc !important;
          border: none !important;
          font-family: inherit !important;
        }

        .pretix-widget-info-reselling {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #94a3b8 !important;
          border-radius: 0.75rem !important;
          padding: 1rem !important;
          margin-bottom: 1.5rem !important;
        }

        /* Premium Card styling for ticket rows */
        .pretix-widget-item-row {
          background: rgba(255, 255, 255, 0.02) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 1rem !important;
          color: #f8fafc !important;
          padding: 1.5rem !important;
          margin-bottom: 1.25rem !important;
          grid-gap: 1.5rem !important;
          gap: 1.5rem !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .pretix-widget-item-row:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 153, 0, 0.2) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.6) !important;
        }

        .pretix-widget-item-row:last-child {
          margin-bottom: 0 !important;
        }

        /* Thumbnail / Image container styling */
        .pretix-widget-item-picture {
          width: 80px !important;
          height: 80px !important;
          min-width: 80px !important;
          border-radius: 0.75rem !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .pretix-widget-item-picture img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .pretix-widget-item-picture img.fallback-logo {
          width: 75% !important;
          height: 75% !important;
          object-fit: contain !important;
          opacity: 0.95 !important;
        }

        /* Ticket details text layout */
        .pretix-widget-item-info {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.25rem !important;
        }

        .pretix-widget-item-title {
          color: #f8fafc !important;
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.02em !important;
        }

        .pretix-widget-item-description {
          color: #94a3b8 !important;
          font-size: 0.875rem !important;
          line-height: 1.6 !important;
          margin-top: 0.25rem !important;
        }

        /* Highlight strong tag */
        .pretix-widget-item-description strong,
        .pretix-widget-item-row strong {
          color: #ff9900 !important;
          font-weight: 600 !important;
        }

        /* Form elements (Voucher input, count select, select options) */
        input[type="text"],
        input[type="number"],
        select {
          background-color: #1b1827 !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 0.5rem !important;
          padding: 8px 12px !important;
          font-weight: 600 !important;
          height: 38px !important;
        }

        /* Select custom arrow adjustments */
        select {
          appearance: none !important;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E") !important;
          background-position: right 8px center !important;
          background-repeat: no-repeat !important;
          background-size: 1.25rem !important;
          padding-right: 2.25rem !important;
        }

        /* Premium quantity controls buttons styling (- / +) */
        .pretix-widget-item-count {
          display: flex !important;
          align-items: center !important;
          gap: 0.35rem !important;
        }

        .pretix-widget-item-count button {
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 0.5rem !important;
          width: 38px !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .pretix-widget-item-count button:hover {
          background-color: #ff9900 !important;
          color: #1b1827 !important;
          border-color: #ff9900 !important;
        }

        /* Action button (Submit / Buy) */
        .pretix-widget-action button, 
        .pretix-widget-action input[type="submit"] {
          background-color: #ff9900 !important;
          color: #1b1827 !important;
          border: none !important;
          font-weight: 700 !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 4px 12px rgba(255, 153, 0, 0.2) !important;
          transition: all 0.2s ease !important;
        }

        .pretix-widget-action button:hover, 
        .pretix-widget-action input[type="submit"]:hover {
          background-color: #e68a00 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(255, 153, 0, 0.3) !important;
        }

        /* Voucher input styling */
        .pretix-widget-voucher-button-wrap button {
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          font-weight: 600 !important;
          border-radius: 0.75rem !important;
        }

        .pretix-widget-voucher-button-wrap button:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
        }

        /* Alert Boxes */
        .pretix-widget-alert-info,
        .pretix-widget-alert-warning,
        .pretix-widget-alert-danger {
          background-color: #1b1827 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #f8fafc !important;
          border-radius: 0.75rem !important;
          padding: 1rem !important;
          margin-bottom: 1.5rem !important;
        }

        .pretix-widget-alert-danger {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }

        /* Text colors inside info frames */
        .pretix-widget-alert-info a,
        .pretix-widget-alert-warning a,
        .pretix-widget-alert-danger a {
          color: #ff9900 !important;
        }

        /* Global link overrides inside widget to avoid default browser blue/purple */
        a,
        a:visited,
        a:hover,
        a:active {
          color: #ff9900 !important;
          text-decoration: none !important;
        }

        a:hover {
          text-decoration: underline !important;
        }

        /* Footer Attribution styling */
        .pretix-widget-attribution,
        .pretix-widget-attribution a,
        .pretix-widget-attribution a:visited {
          color: #64748b !important;
          font-size: 0.75rem !important;
          text-decoration: none !important;
        }

        .pretix-widget-attribution a:hover {
          text-decoration: underline !important;
        }

        /* Original Price (Strikethrough) formatting */
        del,
        .pretix-widget-item-price del,
        .price del {
          color: #64748b !important;
          opacity: 0.65 !important;
          text-decoration: line-through !important;
        }
      `;
      root.appendChild(style);
    };

    const fixWidgetImages = (root: ShadowRoot | Document | HTMLElement) => {
      const rows = root.querySelectorAll(".pretix-widget-item-row");
      rows.forEach((row) => {
        const hasPicture = row.querySelector(".pretix-widget-item-picture");
        
        const forcePlaceholder = (imgElement: HTMLImageElement) => {
          imgElement.src = "/android-chrome-192x192.png";
          imgElement.className = "fallback-logo";
          // Add inline CSS styling directly on the image to ensure it behaves correctly
          imgElement.style.width = "75%";
          imgElement.style.height = "75%";
          imgElement.style.objectFit = "contain";
          imgElement.style.opacity = "0.95";
        };

        if (hasPicture) {
          const img = hasPicture.querySelector("img");
          if (img) {
            const src = img.getAttribute("src");
            
            // Check if src is missing or invalid
            if (!src || src === "" || src === "undefined" || src.includes("localhost") && !src.includes("android-chrome")) {
              forcePlaceholder(img);
            } else if (src.startsWith("/") && !src.startsWith("//") && !src.includes("android-chrome")) {
              img.src = `${baseUrl}${src}`;
            }

            // Immediately force placeholder if image load failed before script execution
            if (img.complete && img.naturalWidth === 0) {
              forcePlaceholder(img);
            }

            // Set up fallback load error listener
            img.onerror = () => {
              forcePlaceholder(img);
              img.onerror = null;
            };
          } else {
            // No img tag: insert fallback img
            const placeholderImg = document.createElement("img");
            placeholderImg.alt = "AWS User Group Jakarta Logo";
            forcePlaceholder(placeholderImg);
            hasPicture.appendChild(placeholderImg);
          }
        } else {
          // If no picture wrapper exists, inject one
          row.classList.add("pretix-widget-item-with-picture");
          const picContainer = document.createElement("div");
          picContainer.className = "pretix-widget-item-picture";
          const placeholderImg = document.createElement("img");
          placeholderImg.alt = "AWS User Group Jakarta Logo";
          forcePlaceholder(placeholderImg);
          picContainer.appendChild(placeholderImg);
          row.insertBefore(picContainer, row.firstChild);
        }
      });
    };

    // Observer setup
    const observer = new MutationObserver(() => {
      const widget = containerRef.current?.querySelector("pretix-widget");
      if (widget) {
        if (widget.shadowRoot) {
          injectStyles(widget.shadowRoot);
          fixWidgetImages(widget.shadowRoot);
        } else {
          // If shadowRoot is not supported or not open, style host container
          injectStyles(widget);
          fixWidgetImages(widget);
        }
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    const checkAndFix = () => {
      const widget = containerRef.current?.querySelector("pretix-widget");
      if (widget) {
        if (widget.shadowRoot) {
          injectStyles(widget.shadowRoot);
          fixWidgetImages(widget.shadowRoot);
          
          // Observe the shadow root directly for child updates
          observer.observe(widget.shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"],
          });
          return true;
        } else {
          injectStyles(widget);
          fixWidgetImages(widget);
        }
      }
      return false;
    };

    checkAndFix();
    const interval = setInterval(() => {
      if (checkAndFix()) {
        clearInterval(interval);
      }
    }, 250);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [state.resourcesLoaded, eventUrl]);

  if (state.hasError) {
    return (
      <div
        ref={containerRef}
        className={`pretix-widget-error w-full min-w-0 p-4 border border-destructive/20 rounded-md bg-destructive/10 text-destructive overflow-hidden ${className}`}
      >
        <p className="font-medium text-base">Error loading ticket widget</p>
        {state.errorMessage && <p className="text-sm mt-1 mb-3 break-words">{state.errorMessage}</p>}
        {eventUrl && eventUrl.startsWith("https://") && (
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 underline"
          >
            Visit event page directly →
          </a>
        )}
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div ref={containerRef} className={`pretix-widget-loading w-full min-w-0 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-base">Loading ticket information...</p>
        {showTimeoutHelper && (
          <div className="mt-4 text-sm text-muted-foreground animate-in fade-in duration-500">
            Taking too long?{" "}
            <a
              href={eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-semibold"
            >
              Open registration page directly
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`pretix-widget-container w-full min-w-0 max-w-full overflow-hidden ${className}`}>
      <pretix-widget
        event={eventUrl}
        subevent={subevent || ""}
        list-type={listType || "list"}
        skip-ssl-check={skipSslCheck ? "" : undefined}
        disable-iframe={disableIframe ? "" : undefined}
      />
      <noscript>
        <div className="w-full min-w-0 p-4 border border-muted rounded-md bg-muted/50 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-2">JavaScript is required to display the ticket widget.</p>
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-primary hover:text-primary/80 underline"
          >
            View tickets on Pretix →
          </a>
        </div>
      </noscript>
    </div>
  );
}
