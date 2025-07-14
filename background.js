let currentSpeaker = 108;

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.type === "SET_SPEAKER") {
    currentSpeaker = msg.speaker;
    fetch(`http://localhost:50021/initialize_speaker?speaker=${msg.speaker}&skip_reinit=true`, {
      method: "POST"
    })
      .then(() => console.log(`Speaker ${msg.speaker} 初始化完成`))
      .catch(err => console.error("背景初始化 speaker 失敗", err));
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "speakSelection",
    title: "VOICEVOX:唸出選取文字",
    contexts: ["selection"]
  });
});


chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "speakSelection") {
    const selectedText = info.selectionText;

    chrome.storage.local.get("voiceSettings", (data) => {
      const settings = data.voiceSettings || {};

      fetch(`http://localhost:50021/audio_query?text=${encodeURIComponent(selectedText)}&speaker=${currentSpeaker}`, {
        method: "POST"
      })
        .then(res => res.json())
        .then(audioQuery => {
          // apply shared settings
          audioQuery.speedScale = settings.speedScale ?? 1.0;
          audioQuery.pitchScale = settings.pitchScale ?? 0.0;
          audioQuery.intonationScale = settings.intonationScale ?? 1.0;
          audioQuery.volumeScale = settings.volumeScale ?? 1.0;
          audioQuery.prePhonemeLength = settings.prePhonemeLength ?? 0.1;
          audioQuery.postPhonemeLength = settings.postPhonemeLength ?? 0.1;
          audioQuery.outputStereo = settings.outputStereo ?? false;

          if (settings.pauseMode === "scale") {
            audioQuery.pauseLength = null;
            audioQuery.pauseLengthScale = settings.pauseLengthScale ?? 1.0;
          } else {
            audioQuery.pauseLength = settings.pauseLength ?? 0.5;
            audioQuery.pauseLengthScale = 1.0;
          }

          return fetch(`http://localhost:50021/synthesis?speaker=${currentSpeaker}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(audioQuery)
          });
        })
        .then(res => res.arrayBuffer())
        .then(buffer => {
          chrome.tabs.sendMessage(tab.id, {
            type: "PLAY_AUDIO",
            buffer: Array.from(new Uint8Array(buffer))
          });
        })
        .catch(err => console.error("語音合成錯誤", err));
    });
  }
});
