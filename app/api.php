<?php
header('Content-Type: application/json; charset=utf-8');

define('DB_PATH', '/var/db/tags.sqlite');

function getDb(): PDO {
    static $db = null;
    if ($db) return $db;
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec("CREATE TABLE IF NOT EXISTS image_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_url TEXT NOT NULL,
        tag TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(image_url, tag)
    )");
    return $db;
}

function resolveUrl(string $base, string $rel): string {
    if (preg_match('#^https?://#', $rel)) return $rel;
    if (str_starts_with($rel, '//')) {
        return (parse_url($base, PHP_URL_SCHEME) ?? 'http') . ':' . $rel;
    }
    $p = parse_url($base);
    $origin = ($p['scheme'] ?? 'http') . '://' . ($p['host'] ?? '');
    if (isset($p['port'])) $origin .= ':' . $p['port'];
    if (str_starts_with($rel, '/')) return $origin . $rel;
    $dir = rtrim(dirname($p['path'] ?? '/'), '/');
    return $origin . $dir . '/' . $rel;
}

function fetchImages(string $pageUrl): array {
    $ctx = stream_context_create(['http' => [
        'timeout' => 20,
        'follow_location' => 1,
        'user_agent' => 'Mozilla/5.0 (compatible; ImageViewer/1.0)',
        'ignore_errors' => true,
    ]]);
    $html = @file_get_contents($pageUrl, false, $ctx);
    if ($html === false) return [];

    $urls = [];

    // img src (both quoted styles)
    preg_match_all('/<img\b[^>]+\bsrc\s*=\s*(?:"([^"]+)"|\'([^\']+)\')[^>]*>/i', $html, $m);
    foreach (array_merge($m[1], $m[2]) as $src) {
        if ($src !== '') $urls[] = resolveUrl($pageUrl, $src);
    }

    // a href to image files
    preg_match_all('/<a\b[^>]+\bhref\s*=\s*(?:"([^"]+)"|\'([^\']+)\')[^>]*>/i', $html, $m);
    foreach (array_merge($m[1], $m[2]) as $href) {
        if (preg_match('/\.(?:jpe?g|gif|png|webp)(?:[?#]|$)/i', $href)) {
            $urls[] = resolveUrl($pageUrl, $href);
        }
    }

    $urls = array_values(array_unique($urls));

    usort($urls, static function (string $a, string $b): int {
        preg_match('/(\d+)(?!.*\d)/', basename($a), $ma);
        preg_match('/(\d+)(?!.*\d)/', basename($b), $mb);
        return (int)($ma[1] ?? 0) <=> (int)($mb[1] ?? 0);
    });

    return $urls;
}

$action = $_GET['action'] ?? '';

if ($action === 'fetch_images') {
    $url = $_GET['url'] ?? '';
    if (!$url) { echo json_encode(['error' => 'url required']); exit; }
    echo json_encode(['images' => fetchImages($url)]);
    exit;
}

if ($action === 'get_tags') {
    $url = $_GET['url'] ?? '';
    if (!$url) { echo json_encode(['tags' => []]); exit; }
    $s = getDb()->prepare('SELECT tag FROM image_tags WHERE image_url = ? ORDER BY tag');
    $s->execute([$url]);
    echo json_encode(['tags' => $s->fetchAll(PDO::FETCH_COLUMN)]);
    exit;
}

if ($action === 'all_tags') {
    $tags = getDb()->query('SELECT DISTINCT tag FROM image_tags ORDER BY tag')->fetchAll(PDO::FETCH_COLUMN);
    echo json_encode(['tags' => $tags]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $url = $data['url'] ?? '';
    $tag = trim($data['tag'] ?? '');

    if ($action === 'add_tag') {
        if (!$url || !$tag) { echo json_encode(['error' => 'url and tag required']); exit; }
        getDb()->prepare('INSERT OR IGNORE INTO image_tags (image_url, tag) VALUES (?, ?)')->execute([$url, $tag]);
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($action === 'remove_tag') {
        if (!$url || !$tag) { echo json_encode(['error' => 'url and tag required']); exit; }
        getDb()->prepare('DELETE FROM image_tags WHERE image_url = ? AND tag = ?')->execute([$url, $tag]);
        echo json_encode(['ok' => true]);
        exit;
    }
}

echo json_encode(['error' => 'unknown action']);
