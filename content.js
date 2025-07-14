chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PLAY_AUDIO") {
    const uint8Array = new Uint8Array(message.buffer);
    const blob = new Blob([uint8Array], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  }
});
