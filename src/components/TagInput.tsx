import { useState, KeyboardEvent } from "react";

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  function addTag() {
    const raw = inputValue.trim().toLowerCase();
    if (!raw) return;
    if (tags.includes(raw)) return;
    onChange([...tags, raw]);
    setInputValue("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
    if (event.key === "Backspace" && inputValue === "" && tags.length > 0) {
      event.preventDefault();
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded border border-outline-variant/50 bg-surface-container px-2 py-0.5 text-xs text-on-surface"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="text-on-surface-variant hover:text-on-surface"
            aria-label={`移除标签 ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? placeholder : undefined}
        className="min-w-[80px] flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
      />
    </div>
  );
}
