const listEl = document.getElementById("speakerList");
const API_BASE = "http://localhost:50021";
const DEFAULT_VALUES = {
    speedScale: 1.0,
    pitchScale: 0.0,
    intonationScale: 1.0,
    volumeScale: 1.0,
    prePhonemeLength: 0.1,
    postPhonemeLength: 0.1,
    pauseLengthScale: 1.0,
    pauseLength: 0.5,
    pauseMode: "scale",
    outputStereo: false,
};

const sliders = [
    "speedScale",
    "pitchScale",
    "intonationScale",
    "volumeScale",
    "prePhonemeLength",
    "postPhonemeLength",
    "pauseLengthScale",
    "pauseLength",
];

// ----------------------- 分頁切換邏輯 -----------------------
document.querySelectorAll("#tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
        // 切換 tab 按鈕樣式
        document.querySelectorAll("#tabs button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // 顯示對應內容區塊
        const tabId = btn.dataset.tab;
        document.querySelectorAll(".tab").forEach((el) => (el.classList.remove("active")));
        document.getElementById(tabId).classList.add("active");

        // 如果切到角色頁，且還沒載入過，就 fetch
        if (tabId === "characterTab" && !window._speakersLoaded) {
            window._speakersLoaded = true;
            loadSpeakers();
        }
    });
});

// ----------------------- 設定區域處理 -----------------------
function bindSliders() {
    for (const key of sliders) {
        const slider = document.getElementById(key);
        const output = document.getElementById(key + "Val");
        if (!slider) continue;
        slider.addEventListener("input", () => {
            output.textContent = parseFloat(slider.value).toFixed(2);
            saveSettings();
        });
    }

    document.getElementById("outputStereo").addEventListener("change", saveSettings);

    document.getElementsByName("pauseMode").forEach((r) =>
        r.addEventListener("change", () => {
            const useScale = document.querySelector("input[name='pauseMode']:checked").value === "scale";
            document.getElementById("pauseLengthScaleGroup").style.display = useScale ? "block" : "none";
            document.getElementById("pauseLengthGroup").style.display = useScale ? "none" : "block";
            saveSettings();
        })
    );
}

function applyValues(values) {
    for (const key of sliders) {
        const slider = document.getElementById(key);
        const output = document.getElementById(key + "Val");
        if (!slider) continue;
        const val = values[key] ?? DEFAULT_VALUES[key];
        slider.value = val;
        output.textContent = val.toFixed(2);
    }

    const mode = values.pauseMode ?? DEFAULT_VALUES.pauseMode;
    document.querySelector(`input[name='pauseMode'][value='${mode}']`).checked = true;
    document.getElementById("pauseLengthScaleGroup").style.display = mode === "scale" ? "block" : "none";
    document.getElementById("pauseLengthGroup").style.display = mode === "scale" ? "none" : "block";

    document.getElementById("outputStereo").checked = values.outputStereo ?? DEFAULT_VALUES.outputStereo;
}

function loadSavedSettings() {
    chrome.storage.local.get("voiceSettings", (data) => {
        const values = data.voiceSettings || DEFAULT_VALUES;
        applyValues(values);
    });
}

function saveSettings() {
    const values = {};
    for (const key of sliders) {
        const slider = document.getElementById(key);
        if (!slider) continue;
        values[key] = parseFloat(slider.value);
    }
    values.pauseMode = document.querySelector("input[name='pauseMode']:checked").value;
    values.outputStereo = document.getElementById("outputStereo").checked;
    chrome.storage.local.set({ voiceSettings: values });
}

function setupResetButton() {
    const resetBtn = document.getElementById("resetPreset");
    resetBtn.addEventListener("click", () => {
        applyValues(DEFAULT_VALUES);
        saveSettings();
    });
}

// ----------------------- 角色載入 -----------------------
let selectedStyleId = parseInt(localStorage.getItem("selectedStyleId") || "108");

async function loadSpeakers() {
    const res = await fetch(`${API_BASE}/speakers`);
    const speakers = await res.json();

    listEl.innerHTML = "";

    for (const speaker of speakers) {
        const speakerInfoRes = await fetch(
            `${API_BASE}/speaker_info?speaker_uuid=${speaker.speaker_uuid}&resource_format=base64`
        );
        const info = await speakerInfoRes.json();

        for (let i = 0; i < speaker.styles.length; i++) {
            const style = speaker.styles[i];
            const styleInfo = info.style_infos.find((s) => s.id === style.id);

            const div = document.createElement("div");
            div.className = "speaker";
            if (style.id === selectedStyleId) div.classList.add("active");

            div.innerHTML = `
                <img src="data:image/png;base64,${styleInfo.icon}" />
                <div>
                <div><strong>${speaker.name}</strong></div>
                <div>${style.name}</div>
                </div>
            `;

            div.onclick = () => {
                selectedStyleId = style.id;
                localStorage.setItem("selectedStyleId", selectedStyleId.toString());
                chrome.runtime.sendMessage({ type: "SET_SPEAKER", speaker: selectedStyleId });

                const img = new Image();
                img.src = "data:image/png;base64," + styleInfo.icon;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 32;
                    canvas.height = 32;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 32, 32);
                    const imageData = ctx.getImageData(0, 0, 32, 32);
                    chrome.action.setIcon({ imageData });
                };

                window.close();
            };

            listEl.appendChild(div);
        }
    }
}

// ----------------------- 初始化 -----------------------
bindSliders();
loadSavedSettings();
setupResetButton();
