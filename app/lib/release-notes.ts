export const CURRENT_VERSION = "0.2.0";

export const PRODUCT_RELEASES = [
  {
    version: "0.2.0",
    date: "2026-08-04",
    title: "阅读状态与书籍详情",
    changes: [
      "查看书籍资料、真实阅读百分比、当前章节与累计阅读时长",
      "按微信读书书架分组和阅读状态筛选电子书",
      "在书架中识别置顶、私密和多分组书籍",
      "增加站内版本更新记录",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-22",
    title: "首个公开版本",
    changes: [
      "连接微信读书官方 API 并展示完整书架",
      "按章节回顾划线与想法，支持 Markdown 复制和导出",
      "提供同步、搜索排序和阅读数据看板",
    ],
  },
] as const;
