'use client';

import React, { useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import type { Editor as TinyMCEEditorType } from 'tinymce';
import { useTheme } from '@/components/theme/theme-provider';
import { uploadApi } from '@/lib/api';
import { toast } from 'sonner';
import { Paperclip, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import TinyMCE Editor to ensure SSR safety
const TinyMCEEditor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] w-full rounded-lg border border-border/70 bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading rich text editor...</span>
      </div>
    ),
  }
);

interface IssueDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  isFullScreen?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const emptySubscribe = () => () => {};

export function IssueDescriptionEditor({
  value,
  onChange,
  isFullScreen = false,
  disabled = false,
  placeholder = 'Add detailed ticket description, acceptance criteria, steps to reproduce, or specifications...',
}: IssueDescriptionEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const editorRef = useRef<TinyMCEEditorType | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // SSR-safe mounted check using useSyncExternalStore without cascading renders
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
            `<p><img src="${result.url}" alt="${result.filename}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" /></p><p>&nbsp;</p>`
          );
        } else {
          const formattedSize = formatFileSize(file.size);
          editor.insertContent(
            `<p><a href="${result.url}" target="_blank" rel="noopener noreferrer" download="${result.filename}" class="tykket-attachment" style="display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; background: rgba(125, 125, 125, 0.12); border: 1px solid rgba(125, 125, 125, 0.25); border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; color: inherit; margin: 6px 0;"><span>📎</span><strong>${result.filename}</strong><span style="font-size: 11px; opacity: 0.65;">(${formattedSize})</span></a></p><p>&nbsp;</p>`
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

  if (!isMounted) {
    return (
      <div className="min-h-[220px] w-full rounded-lg border border-border/70 bg-muted/20 animate-pulse flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading rich text editor...</span>
      </div>
    );
  }

  const editorHeight = isFullScreen ? 480 : 250;

  return (
    <div className="space-y-1.5 w-full">
      {/* Hidden file inputs for attachment & image quick buttons */}
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

      {/* Editor top helper action bar */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Rich Text & Typography</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => imageInputRef.current?.click()}
            className="h-6 px-2 text-[11px] gap-1 bg-background/80 hover:bg-muted cursor-pointer"
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
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-6 px-2 text-[11px] gap-1 bg-background/80 hover:bg-muted cursor-pointer"
            title="Attach Document / File"
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Paperclip className="h-3 w-3 text-primary" />
            )}
            <span>Attach File</span>
          </Button>
        </div>
      </div>

      {/* TinyMCE Editor Container */}
      <div className="rounded-lg overflow-hidden border border-border/80 focus-within:border-primary/50 transition-colors shadow-xs">
        <TinyMCEEditor
          key={`tinymce-${isDark ? 'dark' : 'light'}-${isFullScreen ? 'fs' : 'normal'}`}
          tinymceScriptSrc="/tinymce/tinymce.min.js"
          licenseKey="gpl"
          disabled={disabled}
          value={value}
          onEditorChange={(newContent) => onChange(newContent)}
          init={{
            height: editorHeight,
            min_height: 220,
            max_height: isFullScreen ? 800 : 500,
            menubar: false,
            statusbar: true,
            elementpath: false,
            branding: false,
            promotion: false,
            placeholder: placeholder,
            skin_url: isDark ? '/tinymce/skins/ui/oxide-dark' : '/tinymce/skins/ui/oxide',
            content_css: isDark
              ? '/tinymce/skins/content/dark/content.min.css'
              : '/tinymce/skins/content/default/content.min.css',
            plugins: [
              'advlist',
              'autolink',
              'lists',
              'link',
              'image',
              'charmap',
              'preview',
              'anchor',
              'searchreplace',
              'visualblocks',
              'code',
              'fullscreen',
              'insertdatetime',
              'media',
              'table',
              'wordcount',
            ],
            toolbar:
              'blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | bullist numlist | alignleft aligncenter alignright | link image attachfile table code | undo redo',
            content_style: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: ${isDark ? '#F9F9F9' : '#121111'};
                background-color: ${isDark ? '#121111' : '#FDFDFE'};
                margin: 12px 14px;
              }
              p { margin: 0 0 10px 0; }
              h1 { font-size: 1.6rem; font-weight: 700; margin: 16px 0 8px 0; color: ${isDark ? '#F9F9F9' : '#121111'}; }
              h2 { font-size: 1.35rem; font-weight: 600; margin: 14px 0 6px 0; color: ${isDark ? '#F9F9F9' : '#121111'}; }
              h3 { font-size: 1.15rem; font-weight: 600; margin: 12px 0 6px 0; color: ${isDark ? '#F9F9F9' : '#121111'}; }
              h4 { font-size: 1.0rem; font-weight: 600; margin: 10px 0 4px 0; color: ${isDark ? '#F9F9F9' : '#121111'}; }
              img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; }
              a { color: #0099FF; text-decoration: underline; font-weight: 500; }
              table { border-collapse: collapse; width: 100%; margin: 12px 0; }
              table td, table th { border: 1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'}; padding: 6px 10px; }
              table th { background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}; font-weight: 600; }
              pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
              pre { background: ${isDark ? '#1c1b1b' : '#f1f1f5'}; padding: 10px 14px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
              blockquote { border-left: 3px solid ${isDark ? '#D485FC' : '#0099FF'}; margin: 10px 0; padding-left: 12px; color: ${isDark ? '#a1a1aa' : '#52525b'}; font-style: italic; }
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
                tooltip: 'Attach File (Document, PDF, ZIP)',
                onAction: () => {
                  fileInputRef.current?.click();
                },
              });
            },
          }}
        />
      </div>
    </div>
  );
}