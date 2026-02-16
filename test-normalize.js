function normalizeImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      url = u.pathname;
    } catch {
      return url;
    }
  }
  if (url.startsWith('/upload/') && !url.startsWith('/uploads/')) {
    url = '/uploads/' + url.substring('/upload/'.length);
  }
  return url;
}

const tests = [
  '/upload/category-icons/5835202e-9400-4670-9885-b1a039f37afd.jpg',
  '/uploads/category-icons/abc.jpg',
  'http://localhost:3001/uploads/category-icons/abc.jpg',
  null,
  '',
];
tests.forEach(u => console.log(JSON.stringify(u), '->', JSON.stringify(normalizeImageUrl(u))));
