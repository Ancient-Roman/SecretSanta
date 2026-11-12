'use client';

export function FooterBrand() {
  function triggerSantaMessage() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const original = footer.innerHTML;

    footer.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-4 text-center text-gray-600 text-sm">
        <span class="text-xl">🎅</span>
        <span class="ml-2">You found the secret Santa!</span>
      </div>
    `;
  }

  return (
    <button
      type="button"
      onClick={triggerSantaMessage}
      className="font-medium text-gray-700 cursor-default"
    >
      Copyright © 2026 Drew Bowman
    </button>
  );
}
