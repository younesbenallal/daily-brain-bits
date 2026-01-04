import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type NotionBlockWithChildren = BlockObjectResponse & {
  children?: NotionBlockWithChildren[];
};

const indentUnit = "  ";

export function richTextToMarkdown(richText: RichTextItemResponse[]): string {
  return richText
    .map((item) => {
      if (item.type === "text") {
        let text = item.text.content;
        if (item.text.link?.url) {
          text = `[${text}](${item.text.link.url})`;
        }
        return applyAnnotations(text, item.annotations);
      }

      if (item.type === "equation") {
        return `$${item.equation.expression}$`;
      }

      return item.plain_text;
    })
    .join("");
}

export function blocksToMarkdown(blocks: NotionBlockWithChildren[]): string {
  let markdown = "";
  let prevWasList = false;

  for (const block of blocks) {
    const currentIsList = isListItem(block);
    const blockMarkdown = blockToMarkdown(block, 0).trimEnd();

    if (!blockMarkdown) {
      prevWasList = currentIsList;
      continue;
    }

    const separator = prevWasList && currentIsList ? "\n" : "\n\n";
    if (markdown.length === 0) {
      markdown = blockMarkdown;
    } else {
      markdown += `${separator}${blockMarkdown}`;
    }

    prevWasList = currentIsList;
  }

  return markdown;
}

function blockToMarkdown(block: NotionBlockWithChildren, depth: number): string {
  const prefix = indentUnit.repeat(depth);

  switch (block.type) {
    case "paragraph": {
      const text = richTextToMarkdown(block.paragraph.rich_text);
      return maybeIndent(text, prefix);
    }
    case "heading_1": {
      const text = richTextToMarkdown(block.heading_1.rich_text);
      return maybeIndent(`# ${text}`, prefix);
    }
    case "heading_2": {
      const text = richTextToMarkdown(block.heading_2.rich_text);
      return maybeIndent(`## ${text}`, prefix);
    }
    case "heading_3": {
      const text = richTextToMarkdown(block.heading_3.rich_text);
      return maybeIndent(`### ${text}`, prefix);
    }
    case "bulleted_list_item": {
      return renderListItem("-", block, depth);
    }
    case "numbered_list_item": {
      return renderListItem("1.", block, depth);
    }
    case "to_do": {
      const text = richTextToMarkdown(block.to_do.rich_text);
      const checkbox = block.to_do.checked ? "- [x]" : "- [ ]";
      const base = `${indentUnit.repeat(depth)}${checkbox} ${text}`.trimEnd();
      return appendChildren(base, block, depth + 1);
    }
    case "quote": {
      const text = richTextToMarkdown(block.quote.rich_text);
      const base = maybeIndent(`> ${text}`, prefix);
      return appendChildren(base, block, depth + 1);
    }
    case "callout": {
      const text = richTextToMarkdown(block.callout.rich_text);
      const icon = block.callout.icon?.type === "emoji" ? `${block.callout.icon.emoji} ` : "";
      const base = maybeIndent(`> ${icon}${text}`, prefix);
      return appendChildren(base, block, depth + 1);
    }
    case "code": {
      const code = richTextToMarkdown(block.code.rich_text);
      const language = block.code.language || "";
      const languageSuffix = language ? ` ${language}` : "";
      const fenced = `\`\`\`${languageSuffix}\n${code}\n\`\`\``;
      return maybeIndent(fenced, prefix);
    }
    case "toggle": {
      const text = richTextToMarkdown(block.toggle.rich_text);
      const base = maybeIndent(text, prefix);
      return appendChildren(base, block, depth + 1);
    }
    case "divider": {
      return maybeIndent("---", prefix);
    }
    default: {
      const base = `[Unsupported block: ${block.type}]`;
      return maybeIndent(base, prefix);
    }
  }
}

function renderListItem(
  marker: string,
  block: NotionBlockWithChildren,
  depth: number
): string {
  const text = richTextToMarkdown(getListText(block));
  const base = `${indentUnit.repeat(depth)}${marker} ${text}`.trimEnd();
  return appendChildren(base, block, depth + 1);
}

function getListText(block: NotionBlockWithChildren): RichTextItemResponse[] {
  switch (block.type) {
    case "bulleted_list_item":
      return block.bulleted_list_item.rich_text;
    case "numbered_list_item":
      return block.numbered_list_item.rich_text;
    case "to_do":
      return block.to_do.rich_text;
    default:
      return [];
  }
}

function appendChildren(
  base: string,
  block: NotionBlockWithChildren,
  depth: number
): string {
  if (!block.children || block.children.length === 0) {
    return base;
  }

  const childrenMarkdown = blocksToMarkdownWithDepth(block.children, depth);
  if (!childrenMarkdown) {
    return base;
  }

  return `${base}\n${childrenMarkdown}`.trimEnd();
}

function blocksToMarkdownWithDepth(
  blocks: NotionBlockWithChildren[],
  depth: number
): string {
  let markdown = "";
  let prevWasList = false;

  for (const block of blocks) {
    const currentIsList = isListItem(block);
    const blockMarkdown = blockToMarkdown(block, depth).trimEnd();

    if (!blockMarkdown) {
      prevWasList = currentIsList;
      continue;
    }

    const separator = prevWasList && currentIsList ? "\n" : "\n\n";
    if (markdown.length === 0) {
      markdown = blockMarkdown;
    } else {
      markdown += `${separator}${blockMarkdown}`;
    }

    prevWasList = currentIsList;
  }

  return markdown;
}

function maybeIndent(text: string, prefix: string): string {
  if (!prefix) {
    return text;
  }
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? `${prefix}${line}` : line))
    .join("\n");
}

function applyAnnotations(
  text: string,
  annotations: RichTextItemResponse["annotations"]
): string {
  let result = text;

  if (annotations.code) {
    result = `\`${result}\``;
  }
  if (annotations.bold) {
    result = `**${result}**`;
  }
  if (annotations.italic) {
    result = `*${result}*`;
  }
  if (annotations.strikethrough) {
    result = `~~${result}~~`;
  }
  if (annotations.underline) {
    result = `<u>${result}</u>`;
  }

  return result;
}

function isListItem(block: NotionBlockWithChildren): boolean {
  return (
    block.type === "bulleted_list_item" ||
    block.type === "numbered_list_item" ||
    block.type === "to_do"
  );
}
