/** 只允许扩展实际支持打开的网页 URL，拒绝脚本、文件和内部协议。 */
export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
