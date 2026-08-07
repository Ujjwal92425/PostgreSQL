'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CodeBlockProps = {
  title: string;
  language: string;
  code: string;
};

export function CodeBlock({ title, language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <span>{title}</span>
        <button
          className="focus-ring inline-flex items-center gap-1 rounded-md border border-yc-border bg-yc-bg-card px-2 py-1 text-xs font-bold text-yc-text hover:border-yc-accent"
          type="button"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : language}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
