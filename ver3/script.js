// ---------- 회색 말풍선을 누르면 파란 답장이 옴 ----------

const T = {
  beforeTyping: 150, // 누른 뒤 '입력 중'까지
  typing: 700,       // '입력 중' 보이는 시간
  afterReply: 200,   // 답장 뒤 쪽번호 캡션까지
  unblurStart: 0.4,  // 답장 뒤 첫 번째 바뀐 부분이 걷히기 시작할 때(초)
  unblurGap: 0.9,    // 바뀐 부분이 여러 개일 때 다음 것이 걷히기 시작하는 간격(초)
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 새로 뜬 말풍선이 화면 맨 아래에 붙지 않도록, 화면 위에서 60% 높이까지 올림
// (아래로만 스크롤하고, 이미 그보다 위에 있으면 그대로)
const REVEAL_LINE = 0.6;
let scrollTarget = 0, scrollAnim = null;

// 직접 부드럽게 스크롤 (여러 번 겹쳐 불러도 끊기지 않고 마지막 목표까지 감, 약 60fps)
function smoothTo(target) {
  scrollTarget = target;
  if (scrollAnim) return; // 이미 움직이는 중이면 목표만 바꿈
  const step = () => {
    const diff = scrollTarget - scrollY;
    if (Math.abs(diff) < 2) {
      scrollTo(0, scrollTarget);
      scrollAnim = null;
      return;
    }
    scrollTo(0, scrollY + Math.sign(diff) * Math.max(2, Math.abs(diff) * 0.12)); // 남은 거리의 12%씩 → 끝에서 천천히 멈춤
    scrollAnim = setTimeout(step, 16);
  };
  scrollAnim = setTimeout(step, 16);
}

function reveal(el) {
  const want = el.getBoundingClientRect().bottom + scrollY - innerHeight * REVEAL_LINE;
  const target = Math.max(want, scrollAnim ? scrollTarget : scrollY);
  if (target > scrollY + 1) smoothTo(target); // 아래로만
}

// 사용자가 직접 스크롤하면 자동 스크롤은 멈춤
const stopAuto = () => { clearTimeout(scrollAnim); scrollAnim = null; };
addEventListener('wheel', stopAuto, { passive: true });
addEventListener('touchstart', stopAuto, { passive: true });

// 처음에는 파란 답장과 쪽번호 캡션을 숨김
document.querySelectorAll('.msg.them, .caption.left').forEach((el) => el.classList.add('is-waiting'));

function show(el) {
  el.classList.remove('is-waiting');
  el.classList.add('is-in');
  reveal(el);
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
    reveal(dots);
    await wait(T.typing);
    dots.remove();

    // 바뀐 부분이 여러 개면 앞에서부터 차례로 블러가 걷힘
    reply.querySelectorAll('.serif').forEach((part, i) => {
      part.style.animationDelay = T.unblurStart + i * T.unblurGap + 's';
    });
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
  reveal(next);
  await next.reply();
  busy = false;
});
