export type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

export async function copyUrlToClipboard(
  url: string,
  clipboard: ClipboardLike | undefined = navigator.clipboard
): Promise<void> {
  if (clipboard) {
    await clipboard.writeText(url);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = url;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
