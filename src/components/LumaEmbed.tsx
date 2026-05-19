interface LumaEmbedProps {
  url: string;
}

export function LumaEmbed({ url }: LumaEmbedProps) {
  // Extract event ID from Luma URL
  // Supports both short URLs (h3z9y4s9) and full URLs (https://luma.com/event/evt-XXX)
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
    return lumaUrl.split('/').pop() || '';
  };

  const eventId = getEventId(url);

  return (
    <div className="w-full">
      <iframe
        src={`https://luma.com/embed/event/${eventId}/simple`}
        width="100%"
        height="450"
        frameBorder="0"
        style={{
          border: '1px solid #bfcbda88',
          borderRadius: '4px',
        }}
        allow="fullscreen; payment"
        aria-hidden="false"
        tabIndex={0}
      />
    </div>
  );
}
