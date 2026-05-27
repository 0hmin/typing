const BOT_UA =
  /kakaotalk|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|telegrambot|linkedinbot|yeti|naverbot|googlebot|bingbot/i;

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function courseShareTitle(courseName) {
  const name = (courseName || '').trim();
  return name ? '[' + name + '] 같이 딴짓하자!' : '같이 딴짓하자!';
}

function injectShareMeta(html, { title, description, pageUrl, imageUrl }) {
  const block = `  <!-- OG_SHARE -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:url" content="${escapeAttr(pageUrl)}" />
  <meta property="og:image" content="${escapeAttr(imageUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(imageUrl)}" />
  <!-- /OG_SHARE -->`;

  let out = html;
  if (html.includes('<!-- OG_SHARE -->')) {
    out = html.replace(/<!-- OG_SHARE -->[\s\S]*?<!-- \/OG_SHARE -->/, block);
  } else {
    out = html.replace('</head>', block + '\n</head>');
  }
  return out.replace(/<title>[^<]*<\/title>/i, '<title>' + escapeAttr(title) + '</title>');
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const courseId = url.searchParams.get('course');
  if (!courseId) return fetch(request);

  const ua = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(ua)) return fetch(request);

  const origin = url.origin;
  const pageUrl = origin + url.pathname + url.search;

  let courseName = '';
  try {
    const coursesRes = await fetch(origin + '/courses.json', {
      headers: { accept: 'application/json' },
    });
    if (coursesRes.ok) {
      const courses = await coursesRes.json();
      const course = Array.isArray(courses)
        ? courses.find((c) => c && c.id === courseId)
        : null;
      if (course && course['교과목명']) courseName = String(course['교과목명']).trim();
    }
  } catch (_) {
    /* generic title */
  }

  const title = courseShareTitle(courseName);
  const description = courseName
    ? courseName + ' 수업에 몰래 같이 타이핑해요.'
    : '수업 시간에 몰래 같이 타이핑해요.';
  const imageUrl = origin + '/assets/mudo.jpg';

  let html;
  try {
    const indexRes = await fetch(origin + '/index.html', {
      headers: { accept: 'text/html' },
    });
    if (!indexRes.ok) return fetch(request);
    html = await indexRes.text();
  } catch (_) {
    return fetch(request);
  }

  const body = injectShareMeta(html, { title, description, pageUrl, imageUrl });
  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}

export const config = {
  matcher: ['/', '/index.html'],
};
