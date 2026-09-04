// 项目刻意不安装 @types/node（保持依赖精简），
// 仅声明测试中用到的 node:fs 最小形状。
// 注意：必须是"环境模块声明"（文件内无顶层 import/export），
// 放在测试文件内会退化为 augmentation 而失败。
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
