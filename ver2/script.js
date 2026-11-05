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
