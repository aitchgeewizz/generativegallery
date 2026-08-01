import { useState } from 'react';

interface ColorPaletteProps {
  colors: string[];
}

const writeToClipboard = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('Clipboard copy failed');
};

export const ColorPalette = ({ colors }: ColorPaletteProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (colors.length === 0) return null;

  const copy = async (value: string, label: string) => {
    try {
      await writeToClipboard(value);
      setCopied(label);
      window.setTimeout(() => {
        setCopied((prev) => (prev === label ? null : prev));
      }, 1500);
    } catch {
      setCopied('Copy blocked');
      window.setTimeout(() => {
        setCopied((prev) => (prev === 'Copy blocked' ? null : prev));
      }, 1800);
    }
  };

  return (
    <div className="mt-7">
      <div className="flex items-center justify-between mb-3">
        <p
          className="type-meta"
          style={{ color: 'var(--text-3)' }}
        >
          Palette
        </p>
        <button
          onClick={() => copy(colors.join('\n'), 'All hex copied')}
          className="type-small transition-colors underline-offset-4 hover:underline"
          style={{ color: 'var(--text-3)' }}
          title="Copy all hex codes"
        >
          {copied === 'All hex copied' ? 'Copied' : 'Copy all hex'}
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {colors.map((hex) => (
          <button
            key={hex}
            onClick={() => copy(hex, hex)}
            title={copied === hex ? `Copied ${hex}` : hex}
            aria-label={`Copy ${hex}`}
            className="group flex flex-col gap-1.5 text-left"
          >
            <span
              className="block h-9 rounded-sm transition-transform group-hover:scale-[1.03]"
              style={{
                background: hex,
                boxShadow: '0 0 0 1px var(--border)',
              }}
            />
            <span
              className="type-small tabular-nums underline-offset-4 group-hover:underline"
              style={{ color: 'var(--text-3)' }}
            >
              {hex.replace('#', '')}
            </span>
          </button>
        ))}
      </div>

      {copied && copied !== 'All hex copied' && (
        <p
          className="mt-2 type-small tabular-nums"
          style={{ color: 'var(--text-3)' }}
        >
          {copied === 'Copy blocked' ? 'Copy blocked by browser' : `Copied ${copied}`}
        </p>
      )}

      {copied === 'All hex copied' && (
        <p
          className="mt-2 type-small tabular-nums"
          style={{ color: 'var(--text-3)' }}
        >
          Copied all hex codes
        </p>
      )}
    </div>
  );
};
