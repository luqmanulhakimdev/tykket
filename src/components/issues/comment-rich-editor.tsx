'use client';

import React, { useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import type { Editor as TinyMCEEditorType } from 'tinymce';
import { useTheme } from '@/components/theme/theme-provider';
import { uploadApi } from '@/lib/api';
import { toast } from 'sonner';
import { Paperclip, Image as ImageIcon, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TinyMCEEditor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[140px] w-full rounded-xl border border-border/70 bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading comment editor...</span>
      </div>
    ),
  }
);

interface CommentRichEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: number;
}

const emptySubscribe = () => () => {};

export function CommentRichEditor({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Comment',
  isSubmitting = false,
  placeholder = 'Write a comment... (use Ctrl+Enter to send)',
  autoFocus = false,
  minHeight = 130,
}: CommentRichEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const editorRef = useRef<TinyMCEEditorType | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isImageOnly = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);

    try {
      const result = await uploadApi.uploadFile(file);
      const editor = editorRef.current;

      if (editor) {
        if (isImageOnly || file.type.startsWith('image/')) {
          editor.insertContent(
            `<p><img src="${result.url}" alt="${result.filename}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 6px 0; box-shadow: 0 2px 6px rgba(0,0,0,0.12);" /></p><p>&nbsp;</p>`
          );
        } else {
          const formattedSize = formatFileSize(file.size);
          editor.insertContent(
            `<p><a href="${result.url}" target="_blank" rel="noopener noreferrer" download="${result.filename}" class="tykket-attachment" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: rgba(125, 125, 125, 0.12); border: 1px solid rgba(125, 125, 125, 0.25); border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; color: inherit; margin: 4px 0;"><span>📎</span><strong>${result.filename}</strong><span style="font-size: 10px; opacity: 0.65;">(${formattedSize})</span></a></p><p>&nbsp;</p>`
          );
        }
      }
      toast.success(`${file.name} uploaded successfully`, { id: toastId });
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload file. Please try again.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Check if content has non-empty text or images
  const hasContent = (): boolean => {
    if (!value) return false;
    const stripped = value.replace(/<[^>]*>/g, '').trim();
    if (stripped.length > 0) return true;
    return /<img|<table|<video|<iframe/i.test(value);
  };

  if (!isMounted) {
    return (
      <div className="min-h-[140px] w-full rounded-xl border border-border/70 bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading comment editor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileUpload(e, false)}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, true)}
      />

      {/* Main editor wrapper */}
      <div className="rounded-xl border border-border/80 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 bg-background/80 transition-all overflow-hidden shadow-xs">
        <TinyMCEEditor
          key={`tinymce-comment-${isDark ? 'dark' : 'light'}`}
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          licenseKey="gpl"
          value={value}
          onEditorChange={(newContent) => onChange(newContent)}
          init={{
            height: minHeight,
            min_height: minHeight,
            max_height: 380,
            menubar: false,
            statusbar: false,
            elementpath: false,
            branding: false,
            promotion: false,
            auto_focus: autoFocus ? true : undefined,
            placeholder: placeholder,
            skin_url: isDark ? '/tinymce/skins/ui/oxide-dark' : '/tinymce/skins/ui/oxide',
            content_css: isDark
              ? '/tinymce/skins/content/dark/content.min.css'
              : '/tinymce/skins/content/default/content.min.css',
            plugins: [
              'autolink',
              'lists',
              'link',
              'image',
              'code',
              'table',
              'wordcount',
            ],
            toolbar:
              'bold italic underline strikethrough | forecolor backcolor | bullist numlist | link image attachfile code | undo redo',
            content_style: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 13px;
                line-height: 1.5;
                color: ${isDark ? '#F9F9F9' : '#121111'};
                background-color: ${isDark ? '#121111' : '#FDFDFE'};
                margin: 10px 12px;
              }
              p { margin: 0 0 6px 0; }
              img { max-width: 100%; height: auto; border-radius: 6px; margin: 4px 0; }
              a { color: #0099FF; text-decoration: underline; font-weight: 500; }
              pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
              code { background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}; padding: 2px 4px; border-radius: 4px; font-size: 12px; }
              pre { background: ${isDark ? '#1c1b1b' : '#f1f1f5'}; padding: 8px 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
              blockquote { border-left: 3px solid ${isDark ? '#D485FC' : '#0099FF'}; margin: 8px 0; padding-left: 10px; color: ${isDark ? '#a1a1aa' : '#52525b'}; font-style: italic; }
            `,
            automatic_uploads: true,
            paste_data_images: true,
            images_upload_handler: (blobInfo) => {
              return new Promise(async (resolve, reject) => {
                try {
                  const file = new File([blobInfo.blob()], blobInfo.filename(), {
                    type: blobInfo.blob().type,
                  });
                  const res = await uploadApi.uploadFile(file);
                  resolve(res.url);
                } catch (err: unknown) {
                  console.error('Image upload failed:', err);
                  reject(
                    err instanceof Error ? err.message : 'Image upload failed'
                  );
                }
              });
            },
            setup: (editor) => {
              editorRef.current = editor;
              editor.ui.registry.addButton('attachfile', {
                icon: 'paperclip',
                tooltip: 'Attach File',
                onAction: () => {
                  fileInputRef.current?.click();
                },
              });
              editor.on('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              });
            },
          }}
        />

        {/* Action bar below editor */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/10 text-xs">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || isSubmitting}
              onClick={() => imageInputRef.current?.click()}
              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Upload Image"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ImageIcon className="h-3 w-3 text-primary" />
              )}
              <span>Image</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Attach File"
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="h-3 w-3 text-primary" />
              )}
              <span>Attach File</span>
            </Button>
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline ml-2">
              Ctrl+Enter to send
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={onCancel}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={12} className="mr-1" />
                Cancel
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={!hasContent() || isSubmitting || isUploading}
              onClick={onSubmit}
              className="h-7 px-3 text-xs gap-1.5 cursor-pointer font-medium"
            >
              {isSubmitting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              <span>{submitLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
