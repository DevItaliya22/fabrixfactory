"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const toolbarButtonClass = (active: boolean) =>
  cn(
    "h-8 min-w-8 px-2.5 font-medium shadow-none",
    active
      ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
      : "border-transparent bg-transparent text-foreground/70 hover:bg-muted hover:text-foreground",
  );

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function isEmptyHtml(html: string) {
  const trimmed = html.trim();
  return !trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>";
}

export function richTextToStoredValue(html: string) {
  return isEmptyHtml(html) ? "" : html.trim();
}

export function storedValueToRichText(value: string) {
  if (!value.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function ToolbarButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={toolbarButtonClass(pressed)}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder = "Start writing…",
  className,
  disabled = false,
}: RichTextEditorProps) {
  const skipNextSync = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: storedValueToRichText(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          "prose-editor min-h-24 w-full px-2.5 py-2 text-base outline-none md:text-sm",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      skipNextSync.current = true;
      onChange(richTextToStoredValue(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor || skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    const nextContent = storedValueToRichText(value);
    const currentContent = richTextToStoredValue(editor.getHTML());

    if (nextContent !== currentContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn(
          "min-h-32 rounded-md border border-input bg-transparent shadow-xs dark:bg-input/30",
          className,
        )}
      />
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 p-1.5">
        <ToolbarButton
          pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="Underline"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolbarButton
          pressed={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          label="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          label="Heading 3"
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <ToolbarButton
          pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Quote"
        >
          Quote
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={setLink}
          aria-label="Link"
          title="Link"
          aria-pressed={editor.isActive("link")}
          className={toolbarButtonClass(editor.isActive("link"))}
        >
          Link
        </Button>
        <ToolbarButton
          pressed={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          label="Align left"
        >
          Left
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          label="Align center"
        >
          Center
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          label="Align right"
        >
          Right
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
