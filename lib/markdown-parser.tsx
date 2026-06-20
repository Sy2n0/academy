import React from 'react';
import {
  UrlPreview,
  HeapVisualizer,
  CodeRunner,
} from '@/components/learn/InteractiveBlock';

// Markdown 내용을 파싱해서 커스텀 블록을 React 컴포넌트로 변환
export const parseMarkdownWithComponents = (
  content: string
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // URL 프리뷰 블록: [url:https://example.com]
  const urlPattern = /\[url:(https?:\/\/[^\]]+)\]/g;
  let match;

  while ((match = urlPattern.exec(content)) !== null) {
    // 이전 텍스트 추가
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // URL 컴포넌트 추가
    parts.push(<UrlPreview key={`url-${match.index}`} url={match[1]} />);
    lastIndex = match.index + match[0].length;
  }

  // Heap 시각화 블록: [heap:{"nodes":[...]}]
  const heapPattern = /\[heap:([^\]]+)\]/g;
  lastIndex = 0;

  while ((match = heapPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    try {
      const data = JSON.parse(match[1]);
      parts.push(
        <HeapVisualizer
          key={`heap-${match.index}`}
          data={JSON.stringify(data)}
        />
      );
    } catch {
      parts.push(<HeapVisualizer key={`heap-${match.index}`} />);
    }
    lastIndex = match.index + match[0].length;
  }

  // 코드 실행 블록: [run:language]...code...[/run]
  const codeRunPattern = /\[run:(\w+)\]([\s\S]*?)\[\/run\]/g;
  lastIndex = 0;

  while ((match = codeRunPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    parts.push(
      <CodeRunner
        key={`code-${match.index}`}
        code={match[2].trim()}
        language={match[1]}
      />
    );
    lastIndex = match.index + match[0].length;
  }

  // 나머지 텍스트 추가
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
};

// 간단한 방법: content를 전처리해서 커스텀 블록을 제거하고, 별도로 렌더링
export const extractCustomBlocks = (content: string) => {
  const blocks: Array<{
    type: string;
    props: any;
    original: string;
    index: number;
  }> = [];
  let processedContent = content;

  // 모든 커스텀 블록을 한 번에 찾기 (순서대로)
  const allMatches: Array<{
    type: string;
    match: RegExpMatchArray;
    props: any;
  }> = [];

  // URL 블록
  const urlPattern = /\[url:(https?:\/\/[^\]]+)\]/g;
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    allMatches.push({
      type: 'url',
      match,
      props: { url: match[1] },
    });
  }

  // Heap 블록
  const heapPattern = /\[heap:([^\]]+)\]/g;
  while ((match = heapPattern.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      allMatches.push({
        type: 'heap',
        match,
        props: { data: JSON.stringify(data) },
      });
    } catch {
      allMatches.push({
        type: 'heap',
        match,
        props: {},
      });
    }
  }

  // 코드 실행 블록
  const codeRunPattern = /\[run:(\w+)\]([\s\S]*?)\[\/run\]/g;
  while ((match = codeRunPattern.exec(content)) !== null) {
    allMatches.push({
      type: 'code',
      match,
      props: { code: match[2].trim(), language: match[1] },
    });
  }

  // 인덱스 순으로 정렬
  allMatches.sort((a, b) => a.match.index! - b.match.index!);

  // 역순으로 치환 (인덱스가 변경되지 않도록)
  for (let i = allMatches.length - 1; i >= 0; i--) {
    const item = allMatches[i];
    const placeholder = `__CUSTOM_BLOCK_${item.type.toUpperCase()}_${i}__`;
    blocks.unshift({
      type: item.type,
      props: item.props,
      original: item.match[0],
      index: item.match.index!,
    });
    processedContent =
      processedContent.substring(0, item.match.index!) +
      placeholder +
      processedContent.substring(item.match.index! + item.match[0].length);
  }

  return { processedContent, blocks };
};
