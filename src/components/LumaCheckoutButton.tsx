import { useEffect } from "react";

interface LumaCheckoutButtonProps {
  url: string;
  text?: string;
}

export function LumaCheckoutButton({
  url,
  text = "Register for Event",
}: LumaCheckoutButtonProps) {
  // Extract event ID from Luma URL
  const getEventId = (lumaUrl: string): string => {
    // Try to extract from full event URL format
    const eventMatch = lumaUrl.match(/luma\.com\/event\/([a-zA-Z0-9-]+)/);
    if (eventMatch) {
      return eventMatch[1];
    }

    // Try to extract short URL format
    const shortMatch = lumaUrl.match(/luma\.com\/([a-zA-Z0-9]+)$/);
    if (shortMatch) {
      return shortMatch[1];
    }

    // Fallback to the last part of the URL
    return lumaUrl.split("/").pop() || "";
  };

  const eventId = getEventId(url);

  useEffect(() => {
    // Load Luma checkout script
    const existingScript = document.getElementById("luma-checkout");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "luma-checkout";
      script.src = "https://embed.lu.ma/checkout-button.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const buttonStyles = `
    .luma-checkout--button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #FF9900 !important;
      color: white !important;
      padding: 0.75rem 1.5rem !important;
      border-radius: 0.375rem !important;
      font-weight: 600 !important;
      font-size: 1rem !important;
      text-decoration: none !important;
      border: none !important;
      cursor: pointer !important;
      transition: background-color 0.2s !important;
    }
    .luma-checkout--button:hover {
      background-color: #EC7211 !important;
    }
  `;

  return (
    <div className="inline-block">
      <style>{buttonStyles}</style>
      <a
        href={url}
        className="luma-checkout--button"
        data-luma-action="checkout"
        data-luma-event-id={eventId}
      >
        {text}
      </a>
    </div>
  );
}
