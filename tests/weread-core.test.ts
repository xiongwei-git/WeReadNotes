import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBookMarkdown,
  buildGatewayPayload,
  buildLibraryItems,
  buildWeReadNotebookReaderUrl,
  buildWeReadReaderUrl,
  filterAndSortNotebooks,
  filterAndSortLibraryItems,
  formatDuration,
  formatReadingBucketLabel,
  getBookNoteTotal,
  groupBookNotes,
  mergeShelfReadingMetadata,
  validateApiKey,
} from "../app/lib/weread-core.ts";

test("builds a complete shelf library while preserving notebook-only books", () => {
  const items = buildLibraryItems({
    notebooks: [
      {
        bookId: "book-notes",
        book: { title: "旧标题", author: "作者甲", readUpdateTime: 100 },
        noteCount: 2,
        reviewCount: 1,
        sort: 90,
      },
      {
        bookId: "book-notebook-only",
        book: { title: "只在笔记中", author: "作者乙" },
        noteCount: 1,
        sort: 80,
      },
    ],
    shelfBooks: [
      {
        bookId: "book-notes",
        title: "书架新标题",
        author: "作者甲",
        category: "文学",
        readUpdateTime: 300,
      },
      {
        bookId: "book-no-notes",
        title: "没有笔记的书",
        author: "作者丙",
        readUpdateTime: 200,
      },
    ],
    shelfAlbums: [
      {
        albumInfo: {
          albumId: "album-1",
          name: "通勤听书",
          authorName: "演播者",
          trackCount: 24,
        },
        albumInfoExtra: { lectureReadUpdateTime: 250 },
      },
    ],
    hasArticleCollection: true,
  });

  assert.equal(items.length, 5);
  assert.deepEqual(items.map((item) => item.kind), [
    "book",
    "book",
    "book",
    "album",
    "articles",
  ]);

  const mergedBook = items.find(
    (item) => item.kind === "book" && item.bookId === "book-notes",
  );
  assert.ok(mergedBook?.kind === "book");
  assert.equal(mergedBook.title, "书架新标题");
  assert.equal(mergedBook.hasNotes, true);
  assert.equal(mergedBook.noteTotal, 3);
  assert.equal(mergedBook.readUpdateTime, 300);

  assert.ok(
    items.some(
      (item) =>
        item.kind === "book" && item.bookId === "book-notebook-only",
    ),
  );
});

test("filters the complete library by scope, search, and existing sort modes", () => {
  const items = buildLibraryItems({
    notebooks: [
      {
        bookId: "book-notes",
        book: { title: "有笔记", author: "作者甲" },
        noteCount: 4,
      },
    ],
    shelfBooks: [
      {
        bookId: "book-notes",
        title: "有笔记",
        author: "作者甲",
        readUpdateTime: 100,
      },
      {
        bookId: "book-plain",
        title: "普通电子书",
        author: "作者乙",
        readUpdateTime: 300,
      },
    ],
    shelfAlbums: [
      {
        albumInfo: {
          albumId: "album-1",
          name: "声音之书",
          authorName: "特别演播者",
        },
        albumInfoExtra: { lectureReadUpdateTime: 200 },
      },
    ],
    hasArticleCollection: true,
  });

  assert.deepEqual(
    filterAndSortLibraryItems(items, {
      query: "",
      scope: "notes",
      sortMode: "recent",
    }).map((item) => item.id),
    ["book:book-notes"],
  );
  assert.deepEqual(
    filterAndSortLibraryItems(items, {
      query: "",
      scope: "books",
      sortMode: "recent",
    }).map((item) => item.id),
    ["book:book-plain", "book:book-notes"],
  );
  assert.deepEqual(
    filterAndSortLibraryItems(items, {
      query: "特别演播者",
      scope: "all",
      sortMode: "title",
    }).map((item) => item.id),
    ["album:album-1"],
  );
  assert.deepEqual(
    filterAndSortLibraryItems(items, {
      query: "",
      scope: "all",
      sortMode: "notes",
    }).map((item) => item.id),
    ["book:book-notes", "book:book-plain", "album:album-1", "articles"],
  );
});

test("encodes numeric WeRead API book ids for notebook reader links", () => {
  assert.equal(
    buildWeReadNotebookReaderUrl({
      bookId: "650566",
      book: { bookId: "650566" },
    }),
    "https://weread.qq.com/web/reader/b8632c0059ed46b8641c4cc",
  );
});

test("searches notebooks by title or author and applies all three sort modes", () => {
  const notebooks = [
    {
      bookId: "book-b",
      book: { title: "边城", author: "沈从文", readUpdateTime: 200 },
      reviewCount: 1,
      noteCount: 2,
      bookmarkCount: 0,
      sort: 30,
    },
    {
      bookId: "book-a",
      book: { title: "活着", author: "余华", readUpdateTime: 300 },
      reviewCount: 5,
      noteCount: 4,
      bookmarkCount: 1,
      sort: 20,
    },
    {
      bookId: "book-c",
      book: { title: "三体", author: "刘慈欣" },
      reviewCount: 2,
      noteCount: 2,
      bookmarkCount: 0,
      sort: 400,
    },
  ];

  assert.deepEqual(
    filterAndSortNotebooks(notebooks, "余华", "recent").map((book) => book.bookId),
    ["book-a"],
  );
  assert.deepEqual(
    filterAndSortNotebooks(notebooks, "", "recent").map((book) => book.bookId),
    ["book-c", "book-a", "book-b"],
  );
  assert.deepEqual(
    filterAndSortNotebooks(notebooks, "", "notes").map((book) => book.bookId),
    ["book-a", "book-c", "book-b"],
  );
  assert.deepEqual(
    filterAndSortNotebooks(notebooks, "", "title").map((book) => book.bookId),
    ["book-b", "book-a", "book-c"],
  );
  assert.equal(notebooks[0].bookId, "book-b", "sorting must not mutate API data");
});

test("merges official shelf reading timestamps into note notebooks", () => {
  const notebooks: Array<{
    bookId: string;
    book: { title: string; readUpdateTime?: number };
    sort: number;
  }> = [
    { bookId: "book-1", book: { title: "第一本" }, sort: 100 },
    { bookId: "book-2", book: { title: "第二本" }, sort: 200 },
  ];

  const merged = mergeShelfReadingMetadata(notebooks, [
    { bookId: "book-1", readUpdateTime: 999 },
    { bookId: "other", readUpdateTime: 1_000 },
  ]);

  assert.equal(merged[0].book.readUpdateTime, 999);
  assert.equal(merged[1].book.readUpdateTime, undefined);
  assert.equal(notebooks[0].book.readUpdateTime, undefined);
});

test("formats reading rhythm buckets for each official statistics mode", () => {
  const timestamp = Date.UTC(2026, 6, 22, 12) / 1000;

  assert.equal(formatReadingBucketLabel(String(timestamp), "weekly"), "7/22");
  assert.equal(formatReadingBucketLabel(String(timestamp), "monthly"), "7/22");
  assert.equal(formatReadingBucketLabel(String(timestamp), "annually"), "7月");
  assert.equal(formatReadingBucketLabel(String(timestamp), "overall"), "2026");
});

test("builds a direct WeRead web reader URL from raw or encoded book ids", () => {
  assert.equal(
    buildWeReadReaderUrl("650566"),
    "https://weread.qq.com/web/reader/b8632c0059ed46b8641c4cc",
  );
  assert.equal(
    buildWeReadReaderUrl("405321205b68794054e53fa"),
    "https://weread.qq.com/web/reader/405321205b68794054e53fa",
  );
  assert.equal(buildWeReadReaderUrl(""), null);
});

test("accepts only plausible temporary WeRead API keys", () => {
  assert.equal(validateApiKey("wrk-temporary_key-123456"), true);
  assert.equal(validateApiKey("Bearer wrk-temporary_key-123456"), false);
  assert.equal(validateApiKey("wrk-short"), false);
  assert.equal(validateApiKey("not-a-weread-key"), false);
});

test("exports grouped notes as readable Markdown", () => {
  const markdown = buildBookMarkdown(
    { title: "测试书", author: "测试作者", category: "测试分类" },
    [
      {
        chapterUid: 1,
        chapterIdx: 1,
        title: "第一章",
        items: [
          {
            kind: "underline",
            id: "mark-1",
            quote: "第一行\n第二行",
            createTime: 0,
            thoughts: [{ id: "thought-1", content: "我的想法", createTime: 0 }],
          },
        ],
      },
    ],
  );

  assert.match(markdown, /^# 测试书/m);
  assert.match(markdown, /> 作者：测试作者/);
  assert.match(markdown, /## 第一章/);
  assert.match(markdown, /> 第一行\n> 第二行/);
  assert.match(markdown, /\*\*想法：\*\* 我的想法/);
});

test("builds a flat, version-pinned, endpoint-specific gateway payload", () => {
  assert.deepEqual(
    buildGatewayPayload("/user/notebooks", {
      count: 40,
      lastSort: 1778312777,
      skill_version: "0.0.1",
      params: { count: 999 },
      unexpected: "drop me",
    }),
    {
      api_name: "/user/notebooks",
      count: 40,
      lastSort: 1778312777,
      skill_version: "1.0.4",
    },
  );

  assert.throws(
    () => buildGatewayPayload("/unsafe/write", {}),
    /不支持的微信读书接口/,
  );

  assert.deepEqual(buildGatewayPayload("/book/chapterinfo", { bookId: "book-1" }), {
    api_name: "/book/chapterinfo",
    bookId: "book-1",
    skill_version: "1.0.4",
  });
});

test("calculates note totals using the official counting definition", () => {
  assert.equal(
    getBookNoteTotal({ reviewCount: 7, noteCount: 11, bookmarkCount: 2 }),
    20,
  );
  assert.equal(getBookNoteTotal({ noteCount: 3 }), 3);
});

test("formats official second-based durations for people", () => {
  assert.equal(formatDuration(0), "0 分钟");
  assert.equal(formatDuration(45), "不到 1 分钟");
  assert.equal(formatDuration(5_400), "1 小时 30 分钟");
  assert.equal(formatDuration(7_200), "2 小时");
});

test("groups underlines and personal thoughts by chapter and range", () => {
  const groups = groupBookNotes(
    {
      chapters: [
        { chapterUid: 1, chapterIdx: 1, title: "第一章" },
        { chapterUid: 2, chapterIdx: 2, title: "第二章" },
      ],
      updated: [
        {
          bookmarkId: "mark-1",
          chapterUid: 1,
          range: "10-20",
          markText: "真正重要的不是答案，而是问题。",
          createTime: 100,
        },
      ],
    },
    {
      reviews: [
        {
          review: {
            reviewId: "review-1",
            chapterUid: 1,
            range: "10-20",
            abstract: "真正重要的不是答案，而是问题。",
            content: "这句话值得反复想。",
            createTime: 101,
          },
        },
        {
          review: {
            reviewId: "review-2",
            chapterUid: 2,
            content: "这一章的结构很清楚。",
            createTime: 102,
          },
        },
      ],
    },
  );

  assert.equal(groups.length, 2);
  assert.equal(groups[0].title, "第一章");
  assert.equal(groups[0].items[0].thoughts[0].content, "这句话值得反复想。");
  assert.equal(groups[1].items[0].kind, "thought");
  assert.equal(groups[1].items[0].content, "这一章的结构很清楚。");
});

test("associates a thought by matching quote text when ranges drift", () => {
  const groups = groupBookNotes(
    {
      chapters: [{ chapterUid: 1, chapterIdx: 1, title: "第一章" }],
      updated: [
        {
          bookmarkId: "mark-1",
          chapterUid: 1,
          range: "10-20",
          markText: "同一段原文",
        },
      ],
    },
    {
      reviews: [
        {
          review: {
            reviewId: "review-1",
            chapterUid: 1,
            range: "11-21",
            abstract: "同一段原文",
            content: "range 变化后仍应挂到原划线下。",
          },
        },
      ],
    },
  );

  assert.equal(groups[0].items.length, 1);
  assert.equal(groups[0].items[0].kind, "underline");
  if (groups[0].items[0].kind === "underline") {
    assert.equal(groups[0].items[0].thoughts.length, 1);
  }
});

test("moves an underline into the review chapter when bookmark chapter ids drift", () => {
  const groups = groupBookNotes(
    {
      chapters: [{ chapterUid: 1, chapterIdx: 1, title: "正确章节" }],
      updated: [
        {
          bookmarkId: "mark-1",
          chapterUid: 999,
          range: "10-20",
          markText: "可用于重新定位的原文",
        },
      ],
    },
    {
      reviews: [
        {
          review: {
            reviewId: "review-1",
            chapterUid: 1,
            range: "11-21",
            abstract: "可用于重新定位的原文",
            content: "想法携带了正确章节。",
          },
        },
      ],
    },
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0].title, "正确章节");
  assert.equal(groups[0].items.length, 1);
  assert.equal(groups[0].items[0].kind, "underline");
  if (groups[0].items[0].kind === "underline") {
    assert.equal(groups[0].items[0].thoughts.length, 1);
  }
});
