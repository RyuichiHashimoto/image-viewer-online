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
      <label>
        基準画像URL
        <input id="baseUrl" type="url" placeholder="https://example.com/image001.jpg" autocomplete="off">
      </label>
      <label>
        表示枚数
        <input id="imageCount" type="number" min="1" max="100" step="1" value="2">
      </label>
      <button type="submit">表示</button>
    </form>

    <div class="toolbar">
      <div id="message">左キーで増加、右キーで減少します。増減量は表示枚数と同じです。</div>
      <div class="stepper">
        <button type="button" id="pathMinusButton" aria-label="数字フォルダを増やす">次回</button>
        <button type="button" id="pathPlusButton" aria-label="数字フォルダを減らす">前回</button>
        <button type="button" id="prevButton" aria-label="増やす">←</button>
        <button type="button" id="nextButton" aria-label="減らす">→</button>
      </div>
    </div>

    <section class="viewer" id="viewer" aria-label="image viewer">
      <div class="empty">URLを入力してください</div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>
