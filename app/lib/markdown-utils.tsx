import React from 'react';

/**
 * Markdown形式のリンク [テキスト](URL) をHTMLに変換する関数
 * @param text - Markdown形式のテキスト
 * @param className - ラッパー要素のクラス名（オプション）
 * @param linkClassName - リンク要素のクラス名（オプション）
 * @returns React要素
 */
export function renderMarkdownLinks(
  text: string | null | undefined,
  className?: string,
  linkClassName?: string
): React.ReactElement {
  if (!text) {
    return <span className={className}></span>;
  }

  // Markdownリンク [テキスト](URL) を検出して変換
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // リンク前のテキスト
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // リンク要素
    parts.push(
      <a
        key={`link-${keyCounter++}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName || "underline transition-colors"}
        style={linkClassName ? {} : { color: '#8b6f47' }}
        onMouseEnter={(e) => {
          if (!linkClassName) {
            e.currentTarget.style.color = '#9b7f57';
          }
        }}
        onMouseLeave={(e) => {
          if (!linkClassName) {
            e.currentTarget.style.color = '#8b6f47';
          }
        }}
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // テキストがない場合は空の要素を返す
  if (parts.length === 0) {
    return <span className={className}></span>;
  }

  // すべてが文字列の場合はそのまま返す
  if (parts.every((part) => typeof part === 'string')) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{parts}</span>;
}
