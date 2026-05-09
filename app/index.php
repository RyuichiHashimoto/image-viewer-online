<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Online Image Viewer</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main>
    <header>
      <h1>Online Image Viewer</h1>
    </header>

    <form class="controls" id="urlForm">
      <div class="mode-toggle">
        <label class="mode-label">
          <input type="radio" name="mode" value="html" checked>
          HTMLページURL
        </label>
        <label class="mode-label">
          <input type="radio" name="mode" value="direct">
          直接画像URL
        </label>
      </div>
      <label>
        URL
        <input id="baseUrl" type="url" placeholder="https://example.com/gallery.html" autocomplete="off">
      </label>
      <label>
        表示枚数
        <input id="imageCount" type="number" min="1" max="100" step="1" value="2">
      </label>
      <button type="submit">表示</button>
    </form>

    <div class="url-tags" id="urlTagsSection" hidden>
      <div class="tag-chips" id="urlTagChips"></div>
      <div class="tag-add">
        <input type="text" id="urlTagInput" class="tag-input" placeholder="タグを追加..." list="url-tags-datalist" autocomplete="off">
        <datalist id="url-tags-datalist"></datalist>
        <button type="button" id="urlTagAddBtn" class="tag-add-btn">追加</button>
      </div>
    </div>

    <div class="toolbar">
      <div id="message">URLを入力して表示ボタンを押してください</div>
      <div class="stepper">
        <button type="button" id="toggleTitleButton" aria-label="タイトル表示切替">タイトル非表示</button>
        <button type="button" id="pathMinusButton" aria-label="次の番号">次回</button>
        <button type="button" id="pathPlusButton" aria-label="前の番号">前回</button>
        <button type="button" id="prevButton" aria-label="次へ">←</button>
        <button type="button" id="nextButton" aria-label="前へ">→</button>
      </div>
    </div>

    <section class="viewer" id="viewer" aria-label="image viewer">
      <div class="empty">URLを入力してください</div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
