// 순화 선택지: 단어별로 여기에 오만과 편견 문장을 넣으면 됩니다.
const ALTERNATES = {
  억지: ['선택지 1', '선택지 2', '선택지 3'],
  빡침: ['선택지 1', '선택지 2', '선택지 3'],
  지랄: ['선택지 1', '선택지 2', '선택지 3'],
  지들: ['선택지 1', '선택지 2', '선택지 3'],
};

// 모자이크: 단어를 그린 뒤 아주 작게 줄였다가 픽셀 그대로 키움
const BLOCK = 5; // 모자이크 한 칸 크기(px)

function mosaic(word) {
  const r = word.getBoundingClientRect();
  if (!r.width) return; // 안 보이는 페이지면 건너뜀
  const cs = getComputedStyle(word);
  const big = document.createElement('canvas');
  big.width = Math.ceil(r.width);
  big.height = Math.ceil(r.height);
  const b = big.getContext('2d');
  b.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  b.textBaseline = 'middle';
  // 선택되면 검은 바탕 위 흰 모자이크
  b.fillStyle = word.classList.contains('is-selected') ? 'white' : 'black';
  b.fillText(word.textContent, 0, big.height / 2);

  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(big.width / BLOCK));
  small.height = Math.max(1, Math.round(big.height / BLOCK));
  small.getContext('2d').drawImage(big, 0, 0, small.width, small.height);
  word.style.backgroundImage = `url(${small.toDataURL()})`;
}

function mosaicAll() {
  document.querySelectorAll('.swap.is-censored').forEach(mosaic);
}

mosaicAll();
document.fonts.ready.then(mosaicAll);
window.addEventListener('hashchange', mosaicAll);

// 인디자인 오픈타입 배지 + 메뉴
const badge = document.createElement('button');
badge.className = 'ot-badge';
badge.hidden = true;

const menu = document.createElement('div');
menu.className = 'ot-menu';
menu.hidden = true;

document.body.append(badge, menu);

let current = null;   // 지금 선택된 단어
let wasOpen = false;  // 클릭 직전에 배지/메뉴가 떠 있었는지

// 링크 안에서도 드래그로 텍스트를 긁을 수 있게
document.querySelectorAll('a').forEach((a) => (a.draggable = false));

// 아이콘: Adobe Jenson Pro 장식 글리프 ('3' + ornm 기능)
const INFO_ICON = '<span class="ot-glyph">3</span>';

badge.innerHTML = INFO_ICON; // 긁으면 보이는 버튼도 같은 아이콘

// 선택 표시(검게 반전) 켜고 끄기
function setSelected(word, on) {
  if (!word) return;
  word.classList.toggle('is-selected', on);
  if (word.classList.contains('is-censored')) mosaic(word);
}

function hideUI() {
  badge.hidden = true;
  menu.hidden = true;
  setSelected(current, false);
  current = null;
}

// 1번: 선택 영역 오른쪽 아래 모서리에 O 배지
function showBadge(word) {
  if (current !== word) setSelected(current, false);
  current = word;
  setSelected(word, true);
  const r = word.getBoundingClientRect();
  badge.style.left = r.right + 'px';
  badge.style.top = r.bottom + 'px';
  badge.hidden = false;
  menu.hidden = true;
}

function selectWord(word) {
  const range = document.createRange();
  range.selectNodeContents(word);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// 선택 영역에 걸친 (화면에 보이는) 단어 찾기
function findWord(sel) {
  if (!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  return [...document.querySelectorAll('.swap')].find(
    (w) => w.offsetParent && range.intersectsNode(w)
  );
}

function openMenu() {
  if (!current) return;
  menu.innerHTML = '';
  // 맨 앞: ⓘ 아이콘, 그 뒤로 선택지가 나란히
  const info = document.createElement('span');
  info.className = 'ot-info';
  info.innerHTML = INFO_ICON;
  menu.append(info);
  (ALTERNATES[current.dataset.key] || []).forEach((text) => {
    const item = document.createElement('button');
    item.textContent = text;
    item.addEventListener('click', () => replace(current, text));
    menu.append(item);
  });
  // 2번: ⓘ가 버튼과 같은 자리에 오도록 버튼 위치에 바를 띄움
  menu.style.left = badge.style.left;
  menu.style.top = badge.style.top;
  badge.hidden = true;
  menu.hidden = false;
  // 화면 오른쪽 밖으로 나갈 때만 왼쪽으로 당김
  const overflow = menu.getBoundingClientRect().right - (innerWidth - 8);
  if (overflow > 0) menu.style.left = parseFloat(badge.style.left) - overflow + 'px';
}

function replace(word, text) {
  setSelected(word, false);
  word.textContent = text;
  word.classList.remove('is-censored');
  word.classList.add('is-refined');
  word.style.backgroundImage = '';
  getSelection().removeAllRanges();
  hideUI();
}

badge.addEventListener('click', openMenu);

document.addEventListener('mousedown', (e) => {
  wasOpen = !badge.hidden || !menu.hidden;
});

document.addEventListener('mouseup', (e) => {
  if (e.target.closest('.ot-badge, .ot-menu')) return;
  // 선택 영역이 확정된 뒤에 확인
  setTimeout(() => {
    const sel = getSelection();
    const clicked = e.target.closest('.swap');
    if (sel.isCollapsed && clicked) {
      selectWord(clicked); // 그냥 클릭해도 단어 전체 선택
      showBadge(clicked);
      return;
    }
    const word = !sel.isCollapsed && findWord(sel);
    word ? showBadge(word) : hideUI();
  });
});

// 단어를 고르는 중에는 다음 페이지로 넘어가지 않게
document.addEventListener(
  'click',
  (e) => {
    if (!e.target.closest('a')) return;
    if (wasOpen || e.target.closest('.swap') || !getSelection().isCollapsed) {
      e.preventDefault();
    }
  },
  true
);

window.addEventListener('hashchange', hideUI);
// 창 크기가 바뀌면 모자이크와 배지 위치를 다시 맞춤
window.addEventListener('resize', () => {
  mosaicAll();
  if (!current) return;
  const menuOpen = !menu.hidden;
  showBadge(current);
  if (menuOpen) openMenu();
});
