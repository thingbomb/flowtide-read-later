import { useState, useEffect } from "react";

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

function App() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set(["Today"]));

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const folder = await findOrCreateFolder();
      const bookmarkItems = await chrome.bookmarks.getChildren(folder.id);
      setBookmarks(bookmarkItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const findOrCreateFolder = async () => {
    const results = await chrome.bookmarks.search({ title: "Read Later" });
    if (results.length > 0) {
      return results[0];
    }
    return chrome.bookmarks.create({ title: "Read Later" });
  };

  const saveCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const folder = await findOrCreateFolder();
      await chrome.bookmarks.create({
        parentId: folder.id,
        title: tab.title,
        url: tab.url,
      });
      loadBookmarks();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBookmark = async (id) => {
    try {
      await chrome.bookmarks.remove(id);
      loadBookmarks();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleDate = (date) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const groupBookmarksByDate = () => {
    const groups = {};
    bookmarks.forEach((bookmark) => {
      const date = formatDate(bookmark.dateAdded);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(bookmark);
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === "Today") return -1;
      if (dateB === "Today") return 1;
      if (dateA === "Yesterday") return -1;
      if (dateB === "Yesterday") return 1;
      return (
        new Date(
          dateB.replace(
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), /,
            ""
          )
        ) -
        new Date(
          dateA.replace(
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), /,
            ""
          )
        )
      );
    });
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  const groupedBookmarks = groupBookmarksByDate();

  return (
    <div className="p-4 min-w-[300px] max-w-[400px]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Read Later</h1>
        <button
          onClick={saveCurrentTab}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Save Current Tab
        </button>
      </div>

      <div className="space-y-3">
        {groupedBookmarks.length === 0 ? (
          <p className="text-gray-500">No saved articles yet</p>
        ) : (
          groupedBookmarks.map(([date, dateBookmarks]) => (
            <div key={date} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleDate(date)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 flex justify-between items-center"
              >
                <span className="font-medium">{date}</span>
                <span className="text-gray-500">
                  {dateBookmarks.length}{" "}
                  {dateBookmarks.length === 1 ? "article" : "articles"}
                </span>
              </button>
              {expandedDates.has(date) && (
                <div className="divide-y">
                  {dateBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="flex justify-between items-center p-3 hover:bg-gray-50"
                    >
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate flex-1"
                        title={bookmark.title}
                      >
                        {bookmark.title}
                      </a>
                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
