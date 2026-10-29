export const WEREAD_SKILL_VERSION = "1.0.5";

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
export type LibraryReadingStatus = "all" | "reading" | "finished" | "unread";
export type BookReadingStatus = Exclude<LibraryReadingStatus, "all">;

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
  readerLink?: string;
  deepLink?: string;
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
    readerLink?: string;
    deepLink?: string;
    readUpdateTime?: number | null;
  };
};

type LibraryShelfBookSource = {
  bookId: string;
  title?: string;
  author?: string;
  cover?: string;
  category?: string;
  readerLink?: string;
  deepLink?: string;
  readUpdateTime?: number | null;
  secret?: number | null;
  isTop?: number | null;
  finishReading?: number | null;
};

type LibraryShelfArchiveSource = {
  name?: string;
  bookIds?: string[];
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
  readerLink?: string;
  deepLink?: string;
  hasNotes: boolean;
  noteTotal: number;
  readingStatus: BookReadingStatus;
  collectionNames: string[];
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
  shelfArchives?: readonly LibraryShelfArchiveSource[];
  hasArticleCollection: boolean;
};

type BookInfoSource = {
  bookId?: string;
  readerLink?: string;
  deepLink?: string;
  title?: string;
  author?: string;
  translator?: string;
  cover?: string;
  intro?: string;
  category?: string;
  publisher?: string;
  publishTime?: string | number;
  isbn?: string;
  wordCount?: number;
  newRating?: number;
  newRatingCount?: number;
};

type BookProgressSource = {
  bookId?: string;
  book?: {
    chapterUid?: string | number;
    chapterOffset?: number;
    progress?: number;
    updateTime?: number;
    recordReadingTime?: number;
    finishTime?: number;
    isStartReading?: number | boolean;
  };
};

type BookChapterSource = {
  chapterUid: string | number;
  title?: string;
};

export type BookDetail = {
  bookId?: string;
  readerLink?: string;
  deepLink?: string;
  title?: string;
  author?: string;
  translator?: string;
  cover?: string;
  intro?: string;
  category?: string;
  publisher?: string;
  publishTime?: string;
  isbn?: string;
  wordCount?: number;
  rating?: number;
  ratingCount?: number;
  progress: number;
  readingStatus: BookReadingStatus;
  currentChapterUid?: string;
  currentChapterTitle?: string;
  chapterOffset?: number;
  updateTime?: number;
  recordReadingTime?: number;
  finishTime?: number;
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

type WeReadLinks = { readerLink?: string | null; deepLink?: string | null };

// Only accept official destinations; never derive a URL from a book ID.
function officialWeReadLink(value: string | null | undefined): string | null {
  if (!value || value !== value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" && url.hostname === "weread.qq.com" && !url.port) return value;
    if (url.protocol === "weread:" && url.hostname === "weread") return value;
  } catch {
    // Missing or malformed official link: keep the action unavailable.
  }
  return null;
}

export function buildWeReadNotebookReaderUrl(
  notebook: (WeReadLinks & { bookId?: string | null; book?: (WeReadLinks & { bookId?: string | null }) | null }) | null | undefined,
): string | null {
  return officialWeReadLink(notebook?.book?.readerLink)
    || officialWeReadLink(notebook?.readerLink)
    || officialWeReadLink(notebook?.book?.deepLink)
    || officialWeReadLink(notebook?.deepLink);
}

export class GatewayUpgradeRequiredError extends Error {}

export function assertGatewayCompatible(data: object): void {
  if (Object.hasOwn(data, "upgrade_info")) {
    throw new GatewayUpgradeRequiredError("微信读书接口需要更新，请联系网站维护者更新后重试。");
  }
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
  shelfArchives = [],
  hasArticleCollection,
}: BuildLibraryItemsOptions): LibraryItem[] {
  const notebookByBookId = new Map(
    notebooks.map((notebook) => [notebook.bookId, notebook]),
  );
  const includedBookIds = new Set<string>();
  const items: LibraryItem[] = [];
  const collectionNamesByBookId = new Map<string, string[]>();

  for (const archive of shelfArchives) {
    const name = archive.name?.trim();
    if (!name) continue;
    for (const rawBookId of archive.bookIds || []) {
      const bookId = String(rawBookId || "").trim();
      if (!bookId) continue;
      const names = collectionNamesByBookId.get(bookId) || [];
      if (!names.includes(name)) names.push(name);
      collectionNamesByBookId.set(bookId, names);
    }
  }

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
      readerLink: shelfBook.readerLink || notebook?.book.readerLink,
      deepLink: shelfBook.deepLink || notebook?.book.deepLink,
      readUpdateTime: positiveNumber(
        shelfBook.readUpdateTime ??
          notebook?.book.readUpdateTime ??
          notebook?.sort,
      ),
      isPrivate: Number(shelfBook.secret) === 1,
      isTop: Number(shelfBook.isTop) === 1,
      hasNotes: Boolean(notebook),
      noteTotal,
      readingStatus:
        Number(shelfBook.finishReading) === 1
          ? "finished"
          : positiveNumber(shelfBook.readUpdateTime) !== undefined
            ? "reading"
            : "unread",
      collectionNames: collectionNamesByBookId.get(bookId) || [],
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
      readerLink: notebook.book.readerLink,
      deepLink: notebook.book.deepLink,
      readUpdateTime: positiveNumber(
        notebook.book.readUpdateTime ?? notebook.sort,
      ),
      isPrivate: false,
      isTop: false,
      hasNotes: true,
      noteTotal: getBookNoteTotal(notebook),
      readingStatus:
        positiveNumber(notebook.book.readUpdateTime ?? notebook.sort) !== undefined
          ? "reading"
          : "unread",
      collectionNames: collectionNamesByBookId.get(notebook.bookId) || [],
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
    readingStatus = "all",
    collectionName = "all",
  }: {
    query: string;
    scope: LibraryScope;
    sortMode: BookSortMode;
    readingStatus?: LibraryReadingStatus;
    collectionName?: string;
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
      if (
        readingStatus !== "all" &&
        (item.kind !== "book" || item.readingStatus !== readingStatus)
      ) {
        return false;
      }
      if (
        collectionName !== "all" &&
        (item.kind !== "book" || !item.collectionNames.includes(collectionName))
      ) {
        return false;
      }
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

export function normalizeBookDetail(
  info: BookInfoSource | null | undefined,
  progressResponse: BookProgressSource | null | undefined,
  chapters: readonly BookChapterSource[] = [],
): BookDetail {
  const progressBook = progressResponse?.book;
  const rawProgress = Number(progressBook?.progress);
  const progress = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(100, Math.round(rawProgress)))
    : 0;
  const currentChapterUid =
    progressBook?.chapterUid === undefined || progressBook.chapterUid === null
      ? undefined
      : String(progressBook.chapterUid);
  const currentChapterTitle = currentChapterUid
    ? chapters.find(
        (chapter) => String(chapter.chapterUid) === currentChapterUid,
      )?.title?.trim() || undefined
    : undefined;
  const started =
    progressBook?.isStartReading === true ||
    Number(progressBook?.isStartReading) === 1 ||
    progress > 0 ||
    positiveNumber(progressBook?.updateTime) !== undefined;

  return {
    bookId: info?.bookId || progressResponse?.bookId,
    readerLink: info?.readerLink,
    deepLink: info?.deepLink,
    title: info?.title?.trim() || undefined,
    author: info?.author?.trim() || undefined,
    translator: info?.translator?.trim() || undefined,
    cover: info?.cover,
    intro: info?.intro?.trim() || undefined,
    category: info?.category?.trim() || undefined,
    publisher: info?.publisher?.trim() || undefined,
    publishTime:
      info?.publishTime === undefined || info.publishTime === null
        ? undefined
        : String(info.publishTime),
    isbn: info?.isbn?.trim() || undefined,
    wordCount: positiveNumber(info?.wordCount),
    rating: positiveNumber(info?.newRating),
    ratingCount: positiveNumber(info?.newRatingCount),
    progress,
    readingStatus: progress === 100 ? "finished" : started ? "reading" : "unread",
    currentChapterUid,
    currentChapterTitle,
    chapterOffset: positiveNumber(progressBook?.chapterOffset),
    updateTime: positiveNumber(progressBook?.updateTime),
    recordReadingTime: positiveNumber(progressBook?.recordReadingTime),
    finishTime: positiveNumber(progressBook?.finishTime),
  };
}

export function mergeShelfReadingMetadata<
  T extends { bookId: string; book: Record<string, unknown> },
>(notebooks: readonly T[], shelfBooks: readonly ShelfReadingBook[]): T[] {
  const shelfByBookId = new Map(shelfBooks.map((book) => [book.bookId, book]));
  return notebooks.map((notebook) => {
    const shelfBook = shelfByBookId.get(notebook.bookId);
    return {
      ...notebook,
      book: {
        ...notebook.book,
        ...(shelfBook?.readerLink ? { readerLink: shelfBook.readerLink } : {}),
        ...(shelfBook?.deepLink ? { deepLink: shelfBook.deepLink } : {}),
        ...(shelfBook?.readUpdateTime ? { readUpdateTime: Number(shelfBook.readUpdateTime) } : {}),
      },
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


export function findGatewayUpgradeError(
  results: readonly PromiseSettledResult<unknown>[],
): GatewayUpgradeRequiredError | undefined {
  for (const result of results) {
    if (result.status === "rejected" && result.reason instanceof GatewayUpgradeRequiredError) {
      return result.reason;
    }
  }
}
