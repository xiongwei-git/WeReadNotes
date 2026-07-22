export const WEREAD_SKILL_VERSION = "1.0.4";

const endpointParams = {
  "/shelf/sync": [],
  "/user/notebooks": ["count", "lastSort"],
  "/book/bookmarklist": ["bookId"],
  "/book/chapterinfo": ["bookId"],
  "/review/list/mine": ["bookid", "synckey", "count"],
  "/readdata/detail": ["mode", "baseTime"],
  "/book/info": ["bookId"],
  "/book/getprogress": ["bookId"],
} as const;

export type AllowedApiName = keyof typeof endpointParams;

export type GatewayPayload = Record<string, string | number> & {
  api_name: AllowedApiName;
  skill_version: typeof WEREAD_SKILL_VERSION;
};

type NoteCountSource = {
  reviewCount?: number | null;
  noteCount?: number | null;
  bookmarkCount?: number | null;
};

export type BookSortMode = "recent" | "notes" | "title";
export type ReadStatsMode = "weekly" | "monthly" | "annually" | "overall";
export type LibraryScope = "all" | "notes" | "books" | "albums";

type SortableNotebook = NoteCountSource & {
  bookId: string;
  sort?: number | null;
  book: {
    title: string;
    author?: string;
    readUpdateTime?: number | null;
  };
};

type ShelfReadingBook = {
  bookId: string;
  readUpdateTime?: number | null;
};

type LibraryNotebookSource = NoteCountSource & {
  bookId: string;
  sort?: number | null;
  book: {
    title: string;
    author?: string;
    cover?: string;
    category?: string;
    readUpdateTime?: number | null;
  };
};

type LibraryShelfBookSource = {
  bookId: string;
  title?: string;
  author?: string;
  cover?: string;
  category?: string;
  deepLink?: string;
  readUpdateTime?: number | null;
  secret?: number | null;
  isTop?: number | null;
};

type LibraryShelfAlbumSource = {
  albumInfo?: {
    albumId?: string;
    name?: string;
    authorName?: string;
    cover?: string;
    trackCount?: number | null;
    finishStatus?: string;
    intro?: string;
    updateTime?: number | null;
  };
  albumInfoExtra?: {
    secret?: number | null;
    isTop?: number | null;
    lectureReadUpdateTime?: number | null;
  };
};

type LibraryItemBase = {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  readUpdateTime?: number;
  isPrivate: boolean;
  isTop: boolean;
};

export type LibraryBookItem = LibraryItemBase & {
  kind: "book";
  bookId: string;
  category?: string;
  deepLink?: string;
  hasNotes: boolean;
  noteTotal: number;
};

export type LibraryAlbumItem = LibraryItemBase & {
  kind: "album";
  albumId: string;
  trackCount?: number;
  finishStatus?: string;
  intro?: string;
};

export type LibraryArticlesItem = LibraryItemBase & {
  kind: "articles";
};

export type LibraryItem =
  | LibraryBookItem
  | LibraryAlbumItem
  | LibraryArticlesItem;

export type BuildLibraryItemsOptions = {
  notebooks: readonly LibraryNotebookSource[];
  shelfBooks: readonly LibraryShelfBookSource[];
  shelfAlbums: readonly LibraryShelfAlbumSource[];
  hasArticleCollection: boolean;
};

type Chapter = {
  chapterUid: number;
  chapterIdx?: number;
  title?: string;
};

type Underline = {
  bookmarkId?: string;
  chapterUid?: number;
  range?: string;
  markText?: string;
  createTime?: number;
};

type PersonalReview = {
  reviewId?: string;
  chapterUid?: number;
  chapterIdx?: number;
  chapterName?: string;
  range?: string;
  abstract?: string;
  content?: string;
  createTime?: number;
};

export type NoteThought = {
  id: string;
  content: string;
  abstract?: string;
  createTime: number;
};

export type NoteItem =
  | {
      kind: "underline";
      id: string;
      quote: string;
      range?: string;
      createTime: number;
      thoughts: NoteThought[];
    }
  | {
      kind: "thought";
      id: string;
      content: string;
      abstract?: string;
      createTime: number;
      thoughts: [];
    };

export type NoteGroup = {
  chapterUid: number;
  chapterIdx: number;
  title: string;
  items: NoteItem[];
};

export type BookMarkdownInfo = {
  title: string;
  author?: string;
  category?: string;
};

export function validateApiKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= 512 &&
    /^wrk-[A-Za-z0-9_-]+$/.test(value)
  );
}

const md5ShiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14,
  20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16,
  23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10,
  15, 21, 6, 10, 15, 21,
] as const;

const md5Constants = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
  0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
  0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
  0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
  0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
  0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
] as const;

function rotateLeft(value: number, amount: number): number {
  return (value << amount) | (value >>> (32 - amount));
}

function md5(value: string): string {
  const source = new TextEncoder().encode(value);
  const paddedLength = Math.ceil((source.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;

  const bitLength = source.length * 8;
  for (let index = 0; index < 8; index += 1) {
    bytes[paddedLength - 8 + index] =
      Math.floor(bitLength / 2 ** (index * 8)) & 0xff;
  }

  let hashA = 0x67452301;
  let hashB = 0xefcdab89;
  let hashC = 0x98badcfe;
  let hashD = 0x10325476;
  const view = new DataView(bytes.buffer);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) =>
      view.getUint32(offset + index * 4, true),
    );
    let a = hashA;
    let b = hashB;
    let c = hashC;
    let d = hashD;

    for (let index = 0; index < 64; index += 1) {
      let mixed: number;
      let wordIndex: number;

      if (index < 16) {
        mixed = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        mixed = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        mixed = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        mixed = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }

      const nextD = d;
      d = c;
      c = b;
      const sum = (a + mixed + md5Constants[index] + words[wordIndex]) >>> 0;
      b = (b + rotateLeft(sum, md5ShiftAmounts[index])) >>> 0;
      a = nextD;
    }

    hashA = (hashA + a) >>> 0;
    hashB = (hashB + b) >>> 0;
    hashC = (hashC + c) >>> 0;
    hashD = (hashD + d) >>> 0;
  }

  return [hashA, hashB, hashC, hashD]
    .flatMap((word) => [0, 8, 16, 24].map((shift) => (word >>> shift) & 0xff))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isEncodedWeReadReaderId(value: string): boolean {
  if (value.length <= 3) return false;
  const payload = value.slice(0, -3);
  return md5(payload).slice(0, 3) === value.slice(-3);
}

function encodeWeReadReaderId(bookId: string): string {
  if (isEncodedWeReadReaderId(bookId)) return bookId;

  const digest = md5(bookId);
  const isNumeric = /^\d+$/.test(bookId);
  const parts: string[] = [];

  if (isNumeric) {
    for (let index = 0; index < bookId.length; index += 9) {
      const chunk = bookId.slice(index, index + 9);
      parts.push(Number.parseInt(chunk, 10).toString(16));
    }
  } else {
    let characterCodes = "";
    for (let index = 0; index < bookId.length; index += 1) {
      characterCodes += bookId.charCodeAt(index).toString(16);
    }
    parts.push(characterCodes);
  }

  let readerId = `${digest.slice(0, 3)}${isNumeric ? "3" : "4"}2${digest.slice(-2)}`;
  parts.forEach((part, index) => {
    readerId += `${part.length.toString(16).padStart(2, "0")}${part}`;
    if (index < parts.length - 1) readerId += "g";
  });

  if (readerId.length < 20) {
    readerId += digest.slice(0, 20 - readerId.length);
  }

  return `${readerId}${md5(readerId).slice(0, 3)}`;
}

export function buildWeReadReaderUrl(
  bookId: string | null | undefined,
): string | null {
  const normalizedBookId = bookId?.trim() || "";
  if (!normalizedBookId || normalizedBookId.length > 160) return null;

  const readerId = encodeWeReadReaderId(normalizedBookId);
  return `https://weread.qq.com/web/reader/${encodeURIComponent(readerId)}`;
}

export function buildWeReadNotebookReaderUrl(
  notebook:
    | {
        bookId?: string | null;
        book?: { bookId?: string | null } | null;
      }
    | null
    | undefined,
): string | null {
  return buildWeReadReaderUrl(notebook?.book?.bookId || notebook?.bookId);
}

export function isAllowedApiName(value: unknown): value is AllowedApiName {
  return typeof value === "string" && value in endpointParams;
}

function isValidParam(key: string, value: unknown): value is string | number {
  if (key === "bookId" || key === "bookid") {
    return typeof value === "string" && value.length > 0 && value.length <= 160;
  }

  if (key === "mode") {
    return (
      typeof value === "string" &&
      ["weekly", "monthly", "annually", "overall"].includes(value)
    );
  }

  if (["count", "lastSort", "synckey", "baseTime"].includes(key)) {
    return Number.isSafeInteger(value) && Number(value) >= 0;
  }

  return false;
}

export function buildGatewayPayload(
  apiName: string,
  input: Record<string, unknown>,
): GatewayPayload {
  if (!isAllowedApiName(apiName)) {
    throw new Error("不支持的微信读书接口");
  }

  const payload: GatewayPayload = {
    api_name: apiName,
    skill_version: WEREAD_SKILL_VERSION,
  };

  for (const key of endpointParams[apiName]) {
    const value = input[key];
    if (value === undefined || value === null || value === "") continue;
    if (!isValidParam(key, value)) {
      throw new Error(`接口参数 ${key} 无效`);
    }
    payload[key] = value;
  }

  return payload;
}

export function getBookNoteTotal(source: NoteCountSource): number {
  return (
    Math.max(0, Number(source.reviewCount) || 0) +
    Math.max(0, Number(source.noteCount) || 0) +
    Math.max(0, Number(source.bookmarkCount) || 0)
  );
}

export function filterAndSortNotebooks<T extends SortableNotebook>(
  notebooks: readonly T[],
  query: string,
  sortMode: BookSortMode,
): T[] {
  const keyword = query.trim().toLocaleLowerCase("zh-CN");
  const filtered = keyword
    ? notebooks.filter((notebook) =>
        `${notebook.book.title} ${notebook.book.author || ""}`
          .toLocaleLowerCase("zh-CN")
          .includes(keyword),
      )
    : [...notebooks];

  const titleCollator = new Intl.Collator("zh-CN", {
    numeric: true,
    sensitivity: "base",
  });

  return filtered.sort((left, right) => {
    if (sortMode === "notes") {
      return (
        getBookNoteTotal(right) - getBookNoteTotal(left) ||
        Number(right.book.readUpdateTime ?? right.sort ?? 0) -
          Number(left.book.readUpdateTime ?? left.sort ?? 0)
      );
    }

    if (sortMode === "title") {
      return titleCollator.compare(left.book.title, right.book.title);
    }

    return (
      Number(right.book.readUpdateTime ?? right.sort ?? 0) -
      Number(left.book.readUpdateTime ?? left.sort ?? 0)
    );
  });
}

function positiveNumber(value: unknown): number | undefined {
  const number = Number(value) || 0;
  return number > 0 ? number : undefined;
}

export function buildLibraryItems({
  notebooks,
  shelfBooks,
  shelfAlbums,
  hasArticleCollection,
}: BuildLibraryItemsOptions): LibraryItem[] {
  const notebookByBookId = new Map(
    notebooks.map((notebook) => [notebook.bookId, notebook]),
  );
  const includedBookIds = new Set<string>();
  const items: LibraryItem[] = [];

  for (const shelfBook of shelfBooks) {
    const bookId = String(shelfBook.bookId || "").trim();
    if (!bookId || includedBookIds.has(bookId)) continue;

    const notebook = notebookByBookId.get(bookId);
    const noteTotal = notebook ? getBookNoteTotal(notebook) : 0;
    includedBookIds.add(bookId);
    items.push({
      kind: "book",
      id: `book:${bookId}`,
      bookId,
      title: shelfBook.title?.trim() || notebook?.book.title || "未命名书籍",
      author: shelfBook.author?.trim() || notebook?.book.author,
      cover: shelfBook.cover || notebook?.book.cover,
      category: shelfBook.category || notebook?.book.category,
      deepLink: shelfBook.deepLink,
      readUpdateTime: positiveNumber(
        shelfBook.readUpdateTime ??
          notebook?.book.readUpdateTime ??
          notebook?.sort,
      ),
      isPrivate: Number(shelfBook.secret) === 1,
      isTop: Number(shelfBook.isTop) === 1,
      hasNotes: Boolean(notebook),
      noteTotal,
    });
  }

  for (const notebook of notebooks) {
    if (includedBookIds.has(notebook.bookId)) continue;

    includedBookIds.add(notebook.bookId);
    items.push({
      kind: "book",
      id: `book:${notebook.bookId}`,
      bookId: notebook.bookId,
      title: notebook.book.title || "未命名书籍",
      author: notebook.book.author,
      cover: notebook.book.cover,
      category: notebook.book.category,
      readUpdateTime: positiveNumber(
        notebook.book.readUpdateTime ?? notebook.sort,
      ),
      isPrivate: false,
      isTop: false,
      hasNotes: true,
      noteTotal: getBookNoteTotal(notebook),
    });
  }

  const includedAlbumIds = new Set<string>();
  for (const shelfAlbum of shelfAlbums) {
    const albumId = String(shelfAlbum.albumInfo?.albumId || "").trim();
    if (!albumId || includedAlbumIds.has(albumId)) continue;

    includedAlbumIds.add(albumId);
    items.push({
      kind: "album",
      id: `album:${albumId}`,
      albumId,
      title: shelfAlbum.albumInfo?.name?.trim() || "未命名有声书",
      author: shelfAlbum.albumInfo?.authorName?.trim(),
      cover: shelfAlbum.albumInfo?.cover,
      readUpdateTime: positiveNumber(
        shelfAlbum.albumInfoExtra?.lectureReadUpdateTime ??
          shelfAlbum.albumInfo?.updateTime,
      ),
      isPrivate: Number(shelfAlbum.albumInfoExtra?.secret) === 1,
      isTop: Number(shelfAlbum.albumInfoExtra?.isTop) === 1,
      trackCount: positiveNumber(shelfAlbum.albumInfo?.trackCount),
      finishStatus: shelfAlbum.albumInfo?.finishStatus,
      intro: shelfAlbum.albumInfo?.intro,
    });
  }

  if (hasArticleCollection) {
    items.push({
      kind: "articles",
      id: "articles",
      title: "文章收藏",
      author: "微信读书收藏入口",
      isPrivate: true,
      isTop: false,
    });
  }

  return items;
}

export function filterAndSortLibraryItems(
  items: readonly LibraryItem[],
  {
    query,
    scope,
    sortMode,
  }: {
    query: string;
    scope: LibraryScope;
    sortMode: BookSortMode;
  },
): LibraryItem[] {
  const keyword = query.trim().toLocaleLowerCase("zh-CN");
  const titleCollator = new Intl.Collator("zh-CN", {
    numeric: true,
    sensitivity: "base",
  });

  return items
    .filter((item) => {
      if (scope === "notes" && (item.kind !== "book" || !item.hasNotes)) {
        return false;
      }
      if (scope === "books" && item.kind !== "book") return false;
      if (scope === "albums" && item.kind !== "album") return false;
      if (!keyword) return true;

      return `${item.title} ${item.author || ""}`
        .toLocaleLowerCase("zh-CN")
        .includes(keyword);
    })
    .sort((left, right) => {
      if (sortMode === "title") {
        return titleCollator.compare(left.title, right.title);
      }

      if (sortMode === "notes") {
        const leftNotes = left.kind === "book" ? left.noteTotal : 0;
        const rightNotes = right.kind === "book" ? right.noteTotal : 0;
        return (
          rightNotes - leftNotes ||
          Number(right.readUpdateTime || 0) - Number(left.readUpdateTime || 0)
        );
      }

      return (
        Number(right.readUpdateTime || 0) - Number(left.readUpdateTime || 0)
      );
    });
}

export function mergeShelfReadingMetadata<
  T extends { bookId: string; book: Record<string, unknown> },
>(notebooks: readonly T[], shelfBooks: readonly ShelfReadingBook[]): T[] {
  const readTimeByBookId = new Map(
    shelfBooks.map((book) => [book.bookId, Number(book.readUpdateTime) || 0]),
  );

  return notebooks.map((notebook) => {
    const readUpdateTime = readTimeByBookId.get(notebook.bookId);
    if (!readUpdateTime) return { ...notebook, book: { ...notebook.book } };

    return {
      ...notebook,
      book: { ...notebook.book, readUpdateTime },
    };
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds === 0) return "0 分钟";
  if (safeSeconds < 60) return "不到 1 分钟";

  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分钟`;
}

export function formatReadingBucketLabel(
  timestamp: string,
  mode: ReadStatsMode,
): string {
  const date = new Date(Number(timestamp) * 1000);
  if (mode === "overall") return String(date.getFullYear());
  if (mode === "annually") return `${date.getMonth() + 1}月`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function buildBookMarkdown(
  book: BookMarkdownInfo,
  groups: NoteGroup[],
): string {
  const lines = [
    `# ${book.title}`,
    "",
    book.author ? `> 作者：${book.author}` : "",
    book.category ? `> 分类：${book.category}` : "",
    "",
  ].filter((line, index, list) => line || list[index - 1] !== "");

  for (const group of groups) {
    lines.push(`## ${group.title}`, "");
    for (const item of group.items) {
      if (item.kind === "underline") {
        lines.push(`> ${item.quote.replaceAll("\n", "\n> ")}`, "");
        for (const thought of item.thoughts) {
          lines.push(`**想法：** ${thought.content}`, "");
        }
      } else {
        if (item.abstract) {
          lines.push(`> ${item.abstract.replaceAll("\n", "\n> ")}`, "");
        }
        lines.push(`**想法：** ${item.content}`, "");
      }
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function normalizeThought(review: PersonalReview, index: number): NoteThought {
  return {
    id: review.reviewId || `thought-${review.createTime || 0}-${index}`,
    content: review.content?.trim() || "（未填写文字）",
    abstract: review.abstract?.trim() || undefined,
    createTime: Number(review.createTime) || 0,
  };
}

export function groupBookNotes(
  bookmarkResponse: { chapters?: Chapter[]; updated?: Underline[] },
  reviewResponse: { reviews?: Array<{ review?: PersonalReview }> },
): NoteGroup[] {
  const chapterMap = new Map<number, NoteGroup>();

  const ensureGroup = (
    chapterUid: number,
    fallback?: Pick<PersonalReview, "chapterIdx" | "chapterName">,
  ) => {
    const existing = chapterMap.get(chapterUid);
    if (existing) return existing;

    const chapter = bookmarkResponse.chapters?.find(
      (item) => Number(item.chapterUid) === chapterUid,
    );
    const group: NoteGroup = {
      chapterUid,
      chapterIdx: Number(chapter?.chapterIdx ?? fallback?.chapterIdx ?? 999_999),
      title:
        chapter?.title?.trim() ||
        fallback?.chapterName?.trim() ||
        (chapterUid === 0 ? "全书想法" : "未归类章节"),
      items: [],
    };
    chapterMap.set(chapterUid, group);
    return group;
  };

  for (const [index, underline] of (bookmarkResponse.updated || []).entries()) {
    const chapterUid = Number(underline.chapterUid) || 0;
    ensureGroup(chapterUid).items.push({
      kind: "underline",
      id: underline.bookmarkId || `underline-${chapterUid}-${index}`,
      quote: underline.markText?.trim() || "（划线内容为空）",
      range: underline.range,
      createTime: Number(underline.createTime) || 0,
      thoughts: [],
    });
  }

  for (const [index, wrapper] of (reviewResponse.reviews || []).entries()) {
    const review = wrapper.review || {};
    const chapterUid = Number(review.chapterUid) || 0;
    const group = ensureGroup(chapterUid, review);
    const thought = normalizeThought(review, index);
    let matchingGroup = group;
    let matchingUnderline = group.items.find(
      (item): item is Extract<NoteItem, { kind: "underline" }> =>
        item.kind === "underline" &&
        ((Boolean(review.range) && item.range === review.range) ||
          (Boolean(review.abstract?.trim()) &&
            item.quote.trim() === review.abstract?.trim())),
    );

    if (!matchingUnderline && review.abstract?.trim()) {
      const textMatches = [...chapterMap.values()].flatMap((candidateGroup) =>
        candidateGroup.items
          .filter(
            (item): item is Extract<NoteItem, { kind: "underline" }> =>
              item.kind === "underline" &&
              item.quote.trim() === review.abstract?.trim(),
          )
          .map((item) => ({ group: candidateGroup, item })),
      );

      if (textMatches.length === 1) {
        matchingGroup = textMatches[0].group;
        matchingUnderline = textMatches[0].item;
      }
    }

    if (matchingUnderline) {
      if (matchingGroup !== group) {
        matchingGroup.items = matchingGroup.items.filter(
          (item) => item !== matchingUnderline,
        );
        group.items.push(matchingUnderline);
      }
      matchingUnderline.thoughts.push(thought);
      continue;
    }

    group.items.push({
      kind: "thought",
      id: thought.id,
      content: thought.content,
      abstract: thought.abstract,
      createTime: thought.createTime,
      thoughts: [],
    });
  }

  return [...chapterMap.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.createTime - b.createTime),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => a.chapterIdx - b.chapterIdx);
}
