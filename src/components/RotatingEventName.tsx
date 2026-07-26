import { useEffect, useState } from "react";

interface RotatingEventNameProps {
  names: readonly string[];
}

export function RotatingEventName({ names }: RotatingEventNameProps) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const name = names[index];
    const complete = text === name;
    const empty = text === "";
    const delay = complete ? 3000 : deleting ? 45 : 90;

    const timeout = window.setTimeout(() => {
      if (!deleting && complete) {
        setDeleting(true);
      } else if (deleting && empty) {
        setDeleting(false);
        setIndex((current) => (current + 1) % names.length);
      } else {
        setText(name.slice(0, text.length + (deleting ? -1 : 1)));
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [deleting, index, names, text]);

  return (
    <span aria-live="polite" className="text-primary">
      {text}
      <span aria-hidden="true" className="animate-pulse">|</span>
    </span>
  );
}
