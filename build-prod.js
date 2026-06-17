// בונה גרסת פרודקשן: מתרגם את ה-JSX מראש (build-time) כדי שהדף ייטען מיד,
// בלי Babel בזמן ריצה.
//   קלט : index.src.html  (גרסת המקור, עם JSX — זו שעורכים)
//   פלט : index.html      (הגרסה שמתפרסמת ל-GitHub Pages)
const fs = require("fs");
const babel = require("@babel/core");

const SRC = "index.src.html";
const OUT = "index.html";
const html = fs.readFileSync(SRC, "utf8");

// 1) חילוץ קוד ה-JSX מתוך <script type="text/babel"> ... </script>
const start = html.indexOf('<script type="text/babel">');
const startEnd = html.indexOf(">", start) + 1;
const end = html.indexOf("</script>", startEnd);
if (start === -1 || end === -1) { console.error("babel script not found"); process.exit(1); }
const jsx = html.slice(startEnd, end);

// 2) קומפילציה ל-JS רגיל (ללא JSX)
const { code } = babel.transformSync(jsx, {
  presets: [["@babel/preset-react", { runtime: "classic" }]],
  compact: false,
});

// 3) בניית ה-HTML החדש
// קודם מחליפים את כל בלוק ה-babel בקוד המקומפל (לפי המחרוזת המדויקת, לא לפי אינדקסים),
// כדי שה-replace-ים הבאים לא יזיזו את ההיסטים.
const babelBlock = html.slice(start, end + "</script>".length);
const compiledTag =
  '<!-- קוד מקומפל מראש (build-time) — נטען מיד, ללא Babel בדפדפן -->\n' +
  '  <script>\n' + code + '\n  </script>';
let out = html.replace(babelBlock, compiledTag);

// מסירים את טעינת Babel מה-CDN (כבר לא צריך)
out = out.replace(/\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"><\/script>/, "");

// מצמידים גרסאות מדויקות ל-React (יציבות) במקום הטווח הרחב
out = out.replace("react@18/umd/react.production.min.js", "react@18.3.1/umd/react.production.min.js");
out = out.replace("react-dom@18/umd/react-dom.production.min.js", "react-dom@18.3.1/umd/react-dom.production.min.js");

// מוסיפים הודעת טעינה בתוך #root, כך שלעולם לא יופיע מסך ריק
out = out.replace(
  '<div id="root" style="position:relative; z-index:1;"></div>',
  '<div id="root" style="position:relative; z-index:1;">\n' +
  '    <!-- מוצג רק עד ש-React נטען (שבריר שנייה); React מחליף אותו -->\n' +
  '    <div id="loading" style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;">\n' +
  '      <div class="loader-ring"></div>\n' +
  '      <div style="opacity:.8;font-size:18px;">טוען את המשחק…</div>\n' +
  '    </div>\n' +
  '  </div>'
);

// CSS לספינר הטעינה
out = out.replace(
  "    .bar-fill { transition: width 0.8s cubic-bezier(.2,.8,.2,1); }",
  "    .bar-fill { transition: width 0.8s cubic-bezier(.2,.8,.2,1); }\n" +
  "    .loader-ring { width:54px; height:54px; border-radius:50%; border:5px solid rgba(255,255,255,.25);" +
  " border-top-color:#a5b4fc; animation:spin 0.9s linear infinite; }\n" +
  "    @keyframes spin { to { transform: rotate(360deg); } }"
);

// בדיקת שפיוּת: חייב להיות בדיוק מספר זהה של פתיחות וסגירות script
const opens = (out.match(/<script/g) || []).length;
const closes = (out.match(/<\/script>/g) || []).length;
if (opens !== closes) { console.error("script tag mismatch: " + opens + " open vs " + closes + " close"); process.exit(1); }

fs.writeFileSync(OUT, out, "utf8");
console.log("Built " + OUT + " (" + out.length + " bytes; compiled JS " + code.length + " bytes)");
