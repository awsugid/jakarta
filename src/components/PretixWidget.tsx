import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    PretixWidget?: {
      buildWidgets: () => void;
    };
  }
}

// TypeScript declaration for the pretix-widget custom element
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

// Global resource tracking to prevent duplicate loading
const loadedResources = new Set<string>();
const resourceLoadingPromises = new Map<string, Promise<void>>();

// URL validation utility functions
function isValidPretixUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check if it's a valid URL format
    if (!urlObj.protocol || !urlObj.hostname) {
      return false;
    }

    // Check if it's HTTPS (Pretix typically uses HTTPS)
    if (urlObj.protocol !== "https:") {
      return false;
    }

    // Accept both event URLs (/organizer/event/) and organizer URLs (/organizer/)
    // Organizer URLs display multiple events, event URLs display a single event
    const pathParts = urlObj.pathname
      .split("/")
      .filter((part) => part.length > 0);
    if (pathParts.length < 1) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Generate CSS URL from event URL
function generateCssUrl(eventUrl: string): string {
  try {
    const urlObj = new URL(eventUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    return `${eventUrl}widget/v2.css`;
  } catch (error) {
    return "";
  }
}

// Generate JavaScript URL from event URL
function generateJsUrl(eventUrl: string): string {
  try {
    const urlObj = new URL(eventUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    return `${baseUrl}/widget/v2.en.js`;
  } catch (error) {
    return "";
  }
}

// Load CSS resource dynamically
function loadCssResource(cssUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (loadedResources.has(cssUrl)) {
      resolve();
      return;
    }

    // Check if already loading
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

// Load JavaScript resource dynamically
function loadJsResource(jsUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (loadedResources.has(jsUrl)) {
      resolve();
      return;
    }

    // Check if already loading
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

function validatePretixUrl(url: string): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      errorMessage: "Event URL is required and must be a string",
    };
  }

  if (url.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: "Event URL cannot be empty",
    };
  }

  if (!isValidPretixUrl(url)) {
    return {
      isValid: false,
      errorMessage:
        "Invalid Pretix URL format. Please provide a valid HTTPS URL (e.g., https://pretix.eu/organizer/ or https://pretix.eu/organizer/event/).",
    };
  }

  return { isValid: true };
}

// PretixWidget component props interface
export interface PretixWidgetProps {
  eventUrl: string; // Required: Full Pretix event URL
  subevent?: string; // Optional: Specific subevent ID for series
  listType?: "list" | "calendar" | "week"; // Optional: Display type
  skipSslCheck?: boolean; // Optional: Skip SSL verification
  disableIframe?: boolean; // Optional: Always open in new tab
  className?: string; // Optional: Additional CSS classes
}

// Internal widget state interface
interface WidgetState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  resourcesLoaded: boolean;
  resourceError?: string;
}

export function PretixWidget({
  eventUrl,
  subevent,
  listType,
  skipSslCheck = false,
  disableIframe = false,
  className = "",
}: PretixWidgetProps) {
  // Component state management
  const [state, setState] = useState<WidgetState>({
    isLoading: true,
    hasError: false,
    errorMessage: undefined,
    resourcesLoaded: false,
  });

  // Ref for viewport detection
  const containerRef = useRef<HTMLDivElement>(null);

  // URL validation and resource loading
  useEffect(() => {
    // Validate the provided event URL
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

    // URL is valid, proceed with resource loading
    const loadResources = async () => {
      try {
        const cssUrl = generateCssUrl(eventUrl);
        const jsUrl = generateJsUrl(eventUrl);

        if (!cssUrl || !jsUrl) {
          throw new Error("Failed to generate resource URLs");
        }

        // Load CSS and JS in parallel
        // Resources load regardless of viewport visibility
        await Promise.all([loadCssResource(cssUrl), loadJsResource(jsUrl)]);

        // Resources loaded successfully
        setState({
          isLoading: false,
          hasError: false,
          errorMessage: undefined,
          resourcesLoaded: true,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load widget resources";
        setState({
          isLoading: false,
          hasError: true,
          errorMessage: `Widget loading error: ${errorMessage}`,
          resourcesLoaded: false,
          resourceError: errorMessage,
        });
      }
    };

    loadResources();
  }, [eventUrl]);

  // Viewport optimization: Ensure widget loads even when off-viewport
  useEffect(() => {
    // If resources are already loaded, no need for intersection observer
    if (state.resourcesLoaded || state.hasError) {
      return;
    }

    // Use Intersection Observer to detect when widget enters viewport
    // This ensures the widget is ready when user scrolls to it
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Widget is visible or about to be visible
          // Resources are already loading in parallel, so this is just for optimization
          if (entry.isIntersecting) {
            // Widget is in viewport - resources should be loading
            // No additional action needed as resources load regardless
          }
        });
      },
      {
        // Start loading slightly before widget enters viewport
        rootMargin: "50px",
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [state.resourcesLoaded, state.hasError]);

  // Trigger Pretix widget initialization after resources load
  useEffect(() => {
    if (state.resourcesLoaded && containerRef.current) {
      // Trigger Pretix widget initialization
      if (window.PretixWidget) {
        window.PretixWidget.buildWidgets();
      }
    }
  }, [state.resourcesLoaded]);

  // Error state display with fallback link
  if (state.hasError) {
    return (
      <div
        ref={containerRef}
        className={`pretix-widget-error w-full min-w-0 p-3 sm:p-4 border border-destructive/20 rounded-md bg-destructive/10 text-destructive overflow-hidden ${className}`}
      >
        <p className="font-medium text-sm sm:text-base">
          Error loading ticket widget
        </p>
        {state.errorMessage && (
          <p className="text-xs sm:text-sm mt-1 mb-3 break-words">
            {state.errorMessage}
          </p>
        )}
        {/* Provide fallback link even in error state if URL is somewhat valid */}
        {eventUrl && eventUrl.startsWith("https://") && (
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs sm:text-sm text-primary hover:text-primary/80 underline"
          >
            Visit event page directly →
          </a>
        )}
      </div>
    );
  }

  // Loading state display
  if (state.isLoading) {
    return (
      <div
        ref={containerRef}
        className={`pretix-widget-loading w-full min-w-0 p-6 sm:p-8 text-center ${className}`}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Loading ticket information...
        </p>
      </div>
    );
  }

  // Render the actual pretix-widget element
  return (
    <div
      ref={containerRef}
      className={`pretix-widget-container w-full min-w-0 max-w-full overflow-hidden ${className}`}
    >
      {/* Pretix widget custom element with proper attributes */}
      <pretix-widget
        event={eventUrl}
        subevent={subevent || ""}
        list-type={listType || "list"}
        skip-ssl-check={skipSslCheck ? "true" : "false"}
        disable-iframe={disableIframe ? "true" : "false"}
      />

      {/* Fallback content for browsers with JavaScript disabled */}
      <noscript>
        <div className="w-full min-w-0 p-3 sm:p-4 border border-muted rounded-md bg-muted/50 overflow-hidden">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            JavaScript is required to display the ticket widget.
          </p>
          <a
            href={eventUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs sm:text-sm text-primary hover:text-primary/80 underline"
          >
            View tickets on Pretix →
          </a>
        </div>
      </noscript>
    </div>
  );
}
