import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';

const ACCEPTED = '.txt,.md,.markdown,.pdf,.pptx,.png,.jpg,.jpeg,.webp';

interface UploadZoneProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function UploadZone({ disabled = false, onFiles }: UploadZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const open = () => { if (!disabled) input.current?.click(); };
  const accept = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files));
    if (input.current) input.current.value = '';
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Choose learning material files or drag them here"
      onClick={open}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); }}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        multiple
        hidden
        disabled={disabled}
        onChange={(event) => accept(event.target.files)}
      />
      <span className="upload-icon"><FileUp size={20} strokeWidth={1.8} /></span>
      <span className="upload-copy"><strong>Drop your notes here</strong><small>or browse files · up to 15 MB each</small></span>
      <span className="upload-formats">PDF · PPTX · TXT · MD · IMAGES</span>
    </div>
  );
}
