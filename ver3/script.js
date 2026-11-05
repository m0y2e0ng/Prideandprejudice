// P22 Underground SC는 숫자가 작은 대문자 높이로 그려져 있어서,
// 숫자만 감싸서 대문자 높이(약 1.2배)로 키움
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
const nodes = [];
while (walker.nextNode()) {
  if (/\d/.test(walker.currentNode.nodeValue) && !walker.currentNode.parentElement.closest('script')) {
    nodes.push(walker.currentNode);
  }
}
nodes.forEach((node) => {
  const frag = document.createDocumentFragment();
  node.nodeValue.split(/(\d+)/).forEach((part, i) => {
    if (!part) return;
    if (i % 2) {
      const span = document.createElement('span');
      span.className = 'num';
      span.textContent = part;
      frag.append(span);
    } else {
      frag.append(part);
    }
  });
  node.replaceWith(frag);
});

// ---------- 회색 말풍선을 누르면 파란 답장이 옴 ----------

const T = {
  beforeTyping: 150, // 누른 뒤 '입력 중'까지
  typing: 700,       // '입력 중' 보이는 시간
  afterReply: 200,   // 답장 뒤 쪽번호 캡션까지
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 처음에는 파란 답장과 쪽번호 캡션을 숨김
document.querySelectorAll('.msg.them, .caption.left').forEach((el) => el.classList.add('is-waiting'));

function show(el) {
  el.classList.remove('is-waiting');
  el.classList.add('is-in');
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

const bubbles = [...document.querySelectorAll('.msg.me')];
let last = null; // 마지막으로 누른(답장이 온) 회색 말풍선

bubbles.forEach((bubble) => {
  // 이 회색 말풍선에 대한 답장 찾기 (다음 날짜 전까지)
  let reply = null, pageCaption = null;
  for (let el = bubble.nextElementSibling; el && !el.classList.contains('date'); el = el.nextElementSibling) {
    if (el.matches('.msg.them')) reply = el;
    else if (el.matches('.caption.left')) pageCaption = el;
  }
  if (!reply) return;

  bubble.classList.add('can-reply');
  bubble.reply = async () => {
    if (!bubble.classList.contains('can-reply')) return; // 한 번만
    bubble.classList.remove('can-reply');
    last = bubble;

    await wait(T.beforeTyping);
    const dots = document.createElement('p');
    dots.className = 'msg them typing is-in';
    dots.innerHTML = '<span></span><span></span><span></span>';
    dots.setAttribute('aria-label', '입력 중');
    reply.before(dots);
    dots.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    await wait(T.typing);
    dots.remove();

    show(reply);
    if (pageCaption) {
      await wait(T.afterReply);
      show(pageCaption);
    }
  };
  bubble.addEventListener('click', bubble.reply);
});

// 엔터
// 1. 말풍선을 누른 적이 있으면 → 마지막으로 누른 말풍선 바로 아래부터
// 2. 아직 아무것도 안 눌렀으면 → 맨 위부터
let busy = false;
addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || e.repeat || busy) return;
  const from = last ? bubbles.indexOf(last) + 1 : 0;
  const next = bubbles.slice(from).find((b) => b.classList.contains('can-reply'));
  if (!next) return;
  e.preventDefault();
  busy = true;
  // 필요할 때만 아래로 스크롤 (이미 보이면 그대로)
  next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  await next.reply();
  busy = false;
});
