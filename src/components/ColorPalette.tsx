import { useState } from 'react';

interface ColorPaletteProps {
  colors: string[];
}

/**
 * Cooper Hewitt-style colour palette strip — small square swatches.
 * Hover shows the hex. Click copies that swatch's hex. The "Copy all"
 * action copies the comma-separated palette in one shot.
 *
 * Visual feedback is a brief inline "Copied #RRGGBB" message that
 * fades after ~1.5s so the user knows the click landed (clipboard
 * actions are otherwise silent).
 */
export const ColorPalette = ({ colors }: ColorPaletteProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (colors.length === 0) return null;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => {
        setCopied((prev) => (prev === label ? null : prev));
      }, 1500);
    } catch {
      // Clipboard API unavailable / blocked — silently no-op.
    }
  };

  return (
    <div className="mt-7">
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-xs uppercase tracking-[0.18em] font-display"
          style={{ color: 'var(--text-3)' }}
        >
          Palette
        </p>
        <button
          onClick={() => copy(colors.join(', '), 'palette')}
          className="text-xs font-display tracking-wide transition-colors underline-offset-4 hover:underline"
          style={{ color: 'var(--text-3)' }}
          title="Copy all colours as comma-separated hex"
        >
          {copied === 'palette' ? 'Copied' : 'Copy all'}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {colors.map((hex) => (
          <button
            key={hex}
            onClick={() => copy(hex, hex)}
            title={copied === hex ? `Copied ${hex}` : hex}
            aria-label={`Copy ${hex}`}
            className="w-7 h-7 rounded-sm transition-transform hover:scale-110"
            style={{
              background: hex,
              boxShadow: '0 0 0 1px var(--border)',
            }}
          />
        ))}
      </div>

      {copied && copied !== 'palette' && (
        <p
          className="mt-2 text-xs font-display tabular-nums"
          style={{ color: 'var(--text-3)' }}
        >
          Copied {copied}
        </p>
      )}
    </div>
  );
};
