import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  RemoveFormatting,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Loader2,
  X,
} from "lucide-react";
import { articleService } from "../../services/articleService";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function TiptapEditor({
  content,
  onChange,
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const [inputAlt, setInputAlt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class:
            "tiptap-content-image max-w-full h-auto rounded-xl my-4 mx-auto shadow-md border border-slate-200 block transition-all",
        },
      }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none p-4 min-h-[240px] max-h-[460px] overflow-y-auto focus:outline-none text-slate-800 text-sm leading-relaxed",
      },
      handlePaste: (view, event) => {
        void view;
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault();
            handleProcessUpload(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        void view;
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (imageFile) {
          event.preventDefault();
          handleProcessUpload(imageFile);
          return true;
        }
        return false;
      },
    },
  });

  // Đồng bộ content khi props thay đổi từ bên ngoài (ví dụ khi chọn bài khác để edit)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    }
  }, [content, editor]);

  // Xử lý upload ảnh từ thiết bị
  const handleProcessUpload = async (file: File) => {
    if (!editor) return;
    try {
      setIsUploading(true);
      const url = await articleService.uploadArticleImage(file);
      const cleanAlt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: cleanAlt })
        .run();
    } catch (err: any) {
      alert("Không thể tải ảnh lên: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessUpload(file);
    }
  };

  // Chèn ảnh từ URL link
  const handleInsertByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !editor) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: inputUrl.trim(),
        alt: inputAlt.trim() || "Hình ảnh bài viết",
      })
      .run();
    setInputUrl("");
    setInputAlt("");
    setShowUrlDialog(false);
  };

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 text-xs text-slate-400 bg-slate-50 animate-pulse">
        Đang tải trình soạn thảo TipTap...
      </div>
    );
  }

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all relative">
      {/* Input file ẩn phục vụ chọn ảnh từ máy tính */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
      />

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("bold") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="In đậm (Ctrl+B)"
        >
          <Bold size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("italic") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("strike") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Gạch ngang"
        >
          <Strikethrough size={15} />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-0.5 text-xs font-semibold ${
            editor.isActive("heading", { level: 2 }) ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Tiêu đề chính (H2)"
        >
          <Heading2 size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors flex items-center gap-0.5 text-xs font-semibold ${
            editor.isActive("heading", { level: 3 }) ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Tiêu đề phụ (H3)"
        >
          <Heading3 size={15} />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("bulletList") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Danh sách gạch đầu dòng"
        >
          <List size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("orderedList") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Danh sách số thứ tự"
        >
          <ListOrdered size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
            editor.isActive("blockquote") ? "bg-blue-100 text-blue-700 font-bold" : ""
          }`}
          title="Đoạn trích dẫn"
        >
          <Quote size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          title="Đường phân cách ngang"
        >
          <Minus size={15} />
        </button>

        {/* ── IMAGE INSERT TOOLS ── */}
        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        {/* Nút 1: Tải ảnh từ máy tính */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Tải ảnh lên từ máy tính (PNG, JPG, WebP, GIF)"
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="animate-spin text-amber-600" />
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <Upload size={14} className="text-amber-700" />
              <span>Tải ảnh từ máy</span>
            </>
          )}
        </button>

        {/* Nút 2: Chèn ảnh từ link URL */}
        <button
          type="button"
          onClick={() => setShowUrlDialog(true)}
          className={`px-2 py-1 rounded hover:bg-slate-200 transition-colors flex items-center gap-1 text-xs font-medium ${
            showUrlDialog ? "bg-blue-100 text-blue-700 font-semibold" : "text-slate-700"
          }`}
          title="Chèn ảnh qua đường link URL"
        >
          <ImageIcon size={14} />
          <span>Chèn link ảnh</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-500"
          title="Xóa định dạng"
        >
          <RemoveFormatting size={15} />
        </button>

        <div className="w-[1px] h-5 bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo size={15} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 rounded hover:bg-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo size={15} />
        </button>
      </div>

      {/* ── Dialog nhập link ảnh URL ── */}
      {showUrlDialog && (
        <div className="p-3 bg-blue-50/90 border-b border-blue-200 text-xs flex flex-col sm:flex-row items-center gap-2 animate-in slide-in-from-top-1">
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex items-center gap-1.5">
              <LinkIcon size={14} className="text-blue-600 shrink-0" />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Dán link ảnh (https://...)..."
                className="w-full px-2.5 py-1 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInsertByUrl(e);
                  if (e.key === "Escape") setShowUrlDialog(false);
                }}
              />
            </div>
            <input
              type="text"
              value={inputAlt}
              onChange={(e) => setInputAlt(e.target.value)}
              placeholder="Chú thích ảnh / Alt text (không bắt buộc)..."
              className="w-full px-2.5 py-1 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleInsertByUrl}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
            >
              Chèn ảnh
            </button>
            <button
              type="button"
              onClick={() => setShowUrlDialog(false)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-blue-100 rounded transition-colors"
              title="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Loading Banner khi đang upload ảnh ── */}
      {isUploading && (
        <div className="px-4 py-2 bg-amber-100 text-amber-900 border-b border-amber-200 text-xs flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-amber-700" />
          <span>Đang tải và xử lý hình ảnh lên hệ thống... Vui lòng chờ trong giây lát.</span>
        </div>
      )}

      {/* ── Editor Area ── */}
      <EditorContent editor={editor} />

      {/* Footer gợi ý tính năng ảnh */}
      <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span>💡 Mẹo: Bạn có thể <strong>kéo thả</strong> ảnh trực tiếp vào đây hoặc dùng <strong>Ctrl+V</strong> để dán ảnh chụp màn hình.</span>
      </div>
    </div>
  );
}
