"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  LinkIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect, useCallback } from "react";

const toolbarBtn =
  "flex size-7 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-white hover:text-[#1F2937] disabled:opacity-30";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Napišite poruku...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-[#5055D2] font-semibold underline" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] w-full px-4 py-3 text-sm leading-relaxed outline-none [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-[var(--text-tertiary)] [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL linka", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-0.5 border-b border-[var(--card-border)] bg-[#F8F9FB] px-2 py-1.5">
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Podebljano"
          type="button"
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden="true" size={15} />
        </button>
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kurziv"
          type="button"
          disabled={!editor.can().chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden="true" size={15} />
        </button>
        <div className="mx-1 h-4 w-px bg-[var(--card-border)]" />
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
          type="button"
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden="true" size={15} />
        </button>
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numerisana lista"
          type="button"
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden="true" size={15} />
        </button>
        <div className="mx-1 h-4 w-px bg-[var(--card-border)]" />
        <button
          className={toolbarBtn}
          onClick={setLink}
          title="Dodaj link"
          type="button"
        >
          <LinkIcon aria-hidden="true" size={15} />
        </button>
        <div className="mx-1 h-4 w-px bg-[var(--card-border)]" />
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().undo().run()}
          title="Nazad"
          type="button"
          disabled={!editor.can().chain().focus().undo().run()}
        >
          <Undo2 aria-hidden="true" size={15} />
        </button>
        <button
          className={toolbarBtn}
          onClick={() => editor.chain().focus().redo().run()}
          title="Ponovo"
          type="button"
          disabled={!editor.can().chain().focus().redo().run()}
        >
          <Redo2 aria-hidden="true" size={15} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
