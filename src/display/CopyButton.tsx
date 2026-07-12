import { useRef, useState } from 'react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), 1200);
      },
      () => {
        // Clipboard access can be denied in some environments/contexts; fail silently.
      },
    );
  }

  return (
    <button
      type="button"
      className={className ? `copy-button ${className}` : 'copy-button'}
      onClick={handleClick}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
