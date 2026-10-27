const STORAGE_PROFILE_KEY = "aniguess_user_profile";
const STORAGE_CUSTOM_CHARS_KEY = "aniguess_custom_characters";
const STORAGE_DELETED_CHARS_KEY = "aniguess_deleted_characters";
const STORAGE_RESET_CHARACTER_CATALOG_KEY = "aniguess_reset_character_catalog";
const STORAGE_MUSIC_TRACKS_KEY = "aniguess_music_tracks";

let userProfile = {
  username: "OtakuSensei",
  avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b40-Xy4kZ3oYI96T.png",
  xp: 0,
  level: 1,
  title: "Novice Anime",
  titleLanguage: "romaji",
  stats: {
    gamesPlayed: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    bestStreak: 0,
    currentStreak: 0
  },
  history: []
};

let customCharacters = [];
let deletedCharacterNames = new Set();
let resetCharacterCatalog = false;
let musicTracks = [];
let animeThemeResults = [];
let animeThemeSearchRequest = 0;

function isMusicCategory(category) {
  return ["ost", "opening", "ending"].includes(category);
}

async function toggleMusicPlayback() {
  const video = document.getElementById("game-music-video");
  const button = document.getElementById("game-music-play");
  const status = document.getElementById("game-music-play-status");

  if (!video.paused) {
    video.pause();
    button.innerText = "Écouter l'extrait";
    return;
  }

  try {
    if (video.ended) video.currentTime = 0;
    await video.play();
    button.innerText = "Mettre en pause";
    status.innerText = "Lecture audio en cours (vidéo masquée).";
  } catch (error) {
    console.error("Erreur de lecture du thème vidéo :", error);
    status.innerText = "Lecture impossible. Vérifie la disponibilité de la vidéo à la source.";
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function loadMusicTracks() {
  const saved = localStorage.getItem(STORAGE_MUSIC_TRACKS_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new TypeError("La bibliothèque audio enregistrée n'est pas une liste.");
    }
    musicTracks = parsed.filter(track =>
      track &&
      typeof track.id === "string" &&
      isMusicCategory(track.category) &&
      typeof track.title === "string" &&
      typeof track.animeRomaji === "string" &&
      typeof track.animeEnglish === "string" &&
      (typeof track.mediaUrl === "string" || typeof track.audioUrl === "string")
    ).map(track => ({
      ...track,
      mediaUrl: track.mediaUrl || track.audioUrl,
      mediaType: track.mediaType === "video" ? "video" : "audio"
    }));
    if (musicTracks.length !== parsed.length) {
      console.warn("Certains extraits audio enregistrés ont été ignorés car leurs données sont invalides.");
    }
  } catch (error) {
    console.error("Erreur de chargement des extraits audio :", error);
    showToast("Impossible de lire la bibliothèque audio enregistrée.", "triangle-alert");
  }
}

function saveMusicTracks() {
  try {
    localStorage.setItem(STORAGE_MUSIC_TRACKS_KEY, JSON.stringify(musicTracks));
    return true;
  } catch (error) {
    console.error("Erreur d'enregistrement de la bibliothèque audio :", error);
    showToast("Impossible d'enregistrer la bibliothèque audio.", "triangle-alert");
    return false;
  }
}

function getMusicAnimeTitle(track, lang = userProfile.titleLanguage || "romaji") {
  return lang === "english"
    ? track.animeEnglish || track.animeRomaji
    : track.animeRomaji || track.animeEnglish;
}

function refreshHomeMusicModes() {
  const categories = ["ost", "opening", "ending"];
  let totalTracks = 0;
  categories.forEach(category => {
    const count = musicTracks.filter(track => track.category === category).length;
    totalTracks += count;
    const card = document.getElementById(`home-music-mode-${category}`);
    const status = document.getElementById(`home-music-status-${category}`);
    if (!card || !status) return;

    const isAvailable = count > 0;
    card.classList.toggle("is-unavailable", !isAvailable);
    card.setAttribute("aria-disabled", String(!isAvailable));
    status.innerText = isAvailable
      ? `${count} extrait${count === 1 ? "" : "s"} · Jouer`
      : "Bientôt";
    status.className = `inline-block mt-4 text-[10px] uppercase tracking-wide ${isAvailable ? "text-purple-300" : "text-gray-500"}`;
    card.classList.toggle("cursor-pointer", isAvailable);
  });
  const description = document.getElementById("home-music-description");
  if (description) {
    description.innerText = totalTracks
      ? `${totalTracks} extrait${totalTracks === 1 ? "" : "s"} disponible${totalTracks === 1 ? "" : "s"} dans les modes musicaux.`
      : "Ajoute des extraits audio dans l'espace admin pour débloquer ces modes.";
  }
}

function loadCustomData() {
  resetCharacterCatalog = localStorage.getItem(STORAGE_RESET_CHARACTER_CATALOG_KEY) === "true";

  const savedCustom = localStorage.getItem(STORAGE_CUSTOM_CHARS_KEY);
  if (savedCustom) {
    try {
      customCharacters = JSON.parse(savedCustom);
      // Évite les doublons sauvegardés.
      const seen = new Set();
      customCharacters = customCharacters.filter(c => {
        const key = (c.name || "").trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    } catch(e) {
      console.error("Erreur de chargement des personnages personnalisés", e);
    }
  }

  const savedDeleted = localStorage.getItem(STORAGE_DELETED_CHARS_KEY);
  if (savedDeleted) {
    try {
      deletedCharacterNames = new Set(JSON.parse(savedDeleted));
    } catch(e) {
      console.error("Erreur de chargement des personnages supprimés", e);
    }
  }
}

function saveCustomData() {
  try {
    localStorage.setItem(STORAGE_CUSTOM_CHARS_KEY, JSON.stringify(customCharacters));
    localStorage.setItem(STORAGE_DELETED_CHARS_KEY, JSON.stringify(Array.from(deletedCharacterNames)));
    localStorage.setItem(STORAGE_RESET_CHARACTER_CATALOG_KEY, String(resetCharacterCatalog));
    return true;
  } catch (error) {
    console.error("Erreur d'enregistrement de la base de personnages :", error);
    showToast("Impossible d'enregistrer les changements des personnages.", "triangle-alert");
    return false;
  }
}

// Personnages personnalisés d'abord, puis le catalogue actif.
function getEffectiveCharacters() {
  const seen = new Set();
  const result = [];

  customCharacters.forEach(c => {
    const key = (c.name || "").trim().toLowerCase();
    if (key && !seen.has(key) && !deletedCharacterNames.has(c.name)) {
      seen.add(key);
      result.push(c);
    }
  });

  if (resetCharacterCatalog) return result;

  QUIZ_POOL.forEach(c => {
    const key = (c.name || "").trim().toLowerCase();
    if (key && !seen.has(key) && !deletedCharacterNames.has(c.name)) {
      seen.add(key);
      result.push(c);
    }
  });

  return result;
}

function getEffectiveAnimeTitles() {
  const chars = getEffectiveCharacters();
  const titles = new Set([...ALL_ANIME_TITLES, ...chars.map(c => c.anime)]);
  return Array.from(titles);
}

// Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  if (type === 'correct') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'wrong') {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'levelup') {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.18, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.7);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.7);
    });
  }
}

// Profil et niveaux
function getTitleForLevel(lvl) {
  if (lvl >= 25) return "Hokage Suprême";
  if (lvl >= 20) return "Seigneur Pirate";
  if (lvl >= 15) return "Chasseur de Fléaux";
  if (lvl >= 10) return "Capitaine du Bataillon";
  if (lvl >= 5) return "Initié Confirmé";
  if (lvl >= 2) return "Lecteur Assidu";
  return "Apprenti";
}

function getXpForNextLevel(lvl) {
  return lvl * 150;
}

function setTitleLanguage(lang) {
  userProfile.titleLanguage = lang;
  saveProfile();
  updateLanguageUI();
  showToast(lang === 'romaji' ? "Titres d'anime affichés en Romaji" : "Titres d'anime affichés en anglais", "languages");
}

function updateLanguageUI() {
  const currentLang = userProfile.titleLanguage || 'romaji';
  const btnRomaji = document.getElementById("lang-btn-romaji");
  const btnEnglish = document.getElementById("lang-btn-english");

  if (btnRomaji && btnEnglish) {
    if (currentLang === 'romaji') {
      btnRomaji.className = "px-3.5 py-1.5 rounded-xl bg-purple-600 text-white transition flex items-center space-x-1 shadow-md shadow-purple-600/30";
      btnEnglish.className = "px-3.5 py-1.5 rounded-xl text-gray-400 hover:text-white transition flex items-center space-x-1";
    } else {
      btnEnglish.className = "px-3.5 py-1.5 rounded-xl bg-purple-600 text-white transition flex items-center space-x-1 shadow-md shadow-purple-600/30";
      btnRomaji.className = "px-3.5 py-1.5 rounded-xl text-gray-400 hover:text-white transition flex items-center space-x-1";
    }
  }
}

function loadProfile() {
  const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
  if (saved) {
    try {
      userProfile = { ...userProfile, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Erreur de chargement du profil:", e);
    }
  }
  if (!userProfile.titleLanguage) userProfile.titleLanguage = 'romaji';
  updateLanguageUI();
  updateProfileUI();
}

function saveProfile() {
  localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(userProfile));
  updateProfileUI();
}

function addExperience(amount) {
  const oldLevel = userProfile.level;
  userProfile.xp += amount;

  while (true) {
    const requiredXp = getXpForNextLevel(userProfile.level);
    if (userProfile.xp >= requiredXp) {
      userProfile.xp -= requiredXp;
      userProfile.level += 1;
    } else {
      break;
    }
  }

  userProfile.title = getTitleForLevel(userProfile.level);

  if (userProfile.level > oldLevel) {
    playSound('levelup');
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    showToast(`Niveau supérieur ! Vous êtes Niveau ${userProfile.level} (${userProfile.title})`, "award");
  }

  saveProfile();
}

function updateProfileUI() {
  const headerAvatar = document.getElementById("header-avatar");
  if (headerAvatar) headerAvatar.src = userProfile.avatar;
  const headerLevel = document.getElementById("header-level");
  if (headerLevel) headerLevel.innerText = `Niv. ${userProfile.level}`;
  const headerStreak = document.getElementById("header-streak");
  if (headerStreak) headerStreak.innerText = userProfile.stats.currentStreak;

  const profileAvatar = document.getElementById("profile-avatar-img");
  if (profileAvatar) profileAvatar.src = userProfile.avatar;
  
  const profileUsername = document.getElementById("profile-username");
  if (profileUsername) profileUsername.innerText = userProfile.username;

  const profileTitle = document.getElementById("profile-title-badge");
  if (profileTitle) profileTitle.innerText = userProfile.title;

  const neededXp = getXpForNextLevel(userProfile.level);
  const currentXp = userProfile.xp;
  const percentXp = Math.min(100, Math.round((currentXp / neededXp) * 100));

  const levelLabel = document.getElementById("profile-level-label");
  if (levelLabel) levelLabel.innerText = `Niveau ${userProfile.level}`;

  const xpCounter = document.getElementById("profile-xp-counter");
  if (xpCounter) xpCounter.innerText = `${currentXp} / ${neededXp} XP`;

  const xpBar = document.getElementById("profile-xp-bar");
  if (xpBar) xpBar.style.width = `${percentXp}%`;

  const statGames = document.getElementById("stat-games-played");
  if (statGames) statGames.innerText = userProfile.stats.gamesPlayed;

  const statBestVal = document.getElementById("stat-best-streak-val");
  if (statBestVal) {
    statBestVal.innerText = userProfile.stats.bestStreak;
  } else {
    const statBest = document.getElementById("stat-best-streak");
    if (statBest) statBest.innerHTML = `<span class="flex items-center justify-center space-x-1"><i data-lucide="flame" class="w-5 h-5 text-amber-400"></i><span>${userProfile.stats.bestStreak}</span></span>`;
  }

  const statCorrect = document.getElementById("stat-total-correct");
  if (statCorrect) statCorrect.innerText = userProfile.stats.correctAnswers;

  const statRate = document.getElementById("stat-win-rate");
  if (statRate) {
    const rate = userProfile.stats.totalQuestions > 0 
      ? Math.round((userProfile.stats.correctAnswers / userProfile.stats.totalQuestions) * 100)
      : 0;
    statRate.innerText = `${rate}%`;
  }

  renderHistory();
  if (window.lucide) lucide.createIcons();
}

function renderHistory() {
  const container = document.getElementById("profile-history-list");
  if (!container) return;

  if (userProfile.history.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">Aucune partie enregistrée pour le moment. Lancez un jeu !</p>`;
    return;
  }

  container.innerHTML = userProfile.history.slice(0, 8).map(h => `
    <div class="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs">
      <div class="flex items-center space-x-3">
        <span class="px-2 py-0.5 rounded-lg bg-purple-950 text-purple-300 font-bold uppercase text-[9px] border border-purple-800">
          ${h.mode}
        </span>
        <span class="text-gray-300 font-medium">${h.date}</span>
      </div>
      <div class="flex items-center space-x-4">
        <span class="font-bold text-white">${h.score} / ${h.maxScore}</span>
        <span class="font-black text-amber-400 font-mono">+${h.xpGained} XP</span>
      </div>
    </div>
  `).join('');
}

function editUsernamePrompt() {
  const newName = prompt("Entrez votre nouveau pseudo :", userProfile.username);
  if (newName && newName.trim().length >= 2) {
    userProfile.username = newName.trim().substring(0, 20);
    saveProfile();
    showToast("Pseudo mis à jour !", "check");
  }
}

// Jeu
let currentGame = {
  mode: "classic",
  questionsCount: 10,
  currentIndex: 0,
  score: 0,
  lives: 3,
  timeLeft: 60,
  timerInterval: null,
  revealInterval: null,
  revealSecondsLeft: 10,
  activeCharacter: null,
  isAnsweringLocked: false,
  questionsHistory: []
};

function startGame(mode) {
  const musicCategory = mode.startsWith("music-") ? mode.slice("music-".length) : null;
  const effectiveChars = getEffectiveCharacters();
  if (musicCategory && !isMusicCategory(musicCategory)) {
    console.error(`Catégorie musicale inconnue : ${musicCategory}`);
    return;
  }
  if (musicCategory && !musicTracks.some(track => track.category === musicCategory)) {
    showToast(`Ajoute d'abord un extrait ${musicCategory.toUpperCase()} dans l'espace admin.`, "music-2");
    return;
  }
  if (!musicCategory && effectiveChars.length < 4) {
    alert("Il faut au moins 4 personnages dans la base pour jouer. Ajoutez-en via l'espace Admin !");
    return;
  }

  currentGame.mode = mode;
  currentGame.currentIndex = 0;
  currentGame.score = 0;
  currentGame.lives = 3;
  currentGame.timeLeft = 60;
  currentGame.revealSecondsLeft = 10;
  currentGame.isAnsweringLocked = false;
  currentGame.questionsHistory = [];

  if (currentGame.timerInterval) clearInterval(currentGame.timerInterval);
  if (currentGame.revealInterval) clearInterval(currentGame.revealInterval);

  showView("game");

  const modeIndicator = document.getElementById("game-mode-indicator");
  if (mode === "speedrun") {
    currentGame.questionsCount = 999;
    modeIndicator.innerHTML = `
      <div class="flex items-center space-x-1.5 text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-xl">
        <i data-lucide="timer" class="w-4 h-4"></i>
        <span id="speedrun-timer" class="font-mono text-sm font-black">60s</span>
      </div>
    `;
    startSpeedrunTimer();
  } else if (mode === "survival") {
    currentGame.questionsCount = 999;
    updateSurvivalHearts();
  } else if (mode === "image-reveal") {
    currentGame.questionsCount = 10;
    modeIndicator.innerHTML = `
      <div class="text-xs font-bold text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-800">
        Image mystère
      </div>
      <span id="image-reveal-timer" class="text-xs text-gray-400 font-mono">10s</span>
    `;
  } else if (musicCategory) {
    currentGame.questionsCount = 10;
    modeIndicator.innerHTML = `
      <div class="text-xs font-bold text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-800">
        ${musicCategory.toUpperCase()}
      </div>
    `;
  } else {
    currentGame.questionsCount = 10;
    modeIndicator.innerHTML = `
      <div class="text-xs font-bold text-purple-300 bg-purple-950/60 px-3 py-1 rounded-xl border border-purple-800">
        Classique
      </div>
    `;
  }

  nextQuestion();
  if (window.lucide) lucide.createIcons();
}

function startMusicGame(category) {
  if (!isMusicCategory(category)) {
    console.error(`Catégorie musicale inconnue : ${category}`);
    return;
  }
  startGame(`music-${category}`);
}

function updateSurvivalHearts() {
  const modeIndicator = document.getElementById("game-mode-indicator");
  let heartsHtml = "";
  for (let i = 0; i < 3; i++) {
    if (i < currentGame.lives) {
      heartsHtml += '<i data-lucide="heart" class="w-4 h-4 text-rose-500 fill-rose-500"></i>';
    } else {
      heartsHtml += '<i data-lucide="heart" class="w-4 h-4 text-gray-700"></i>';
    }
  }
  modeIndicator.innerHTML = `
    <div class="flex items-center space-x-1.5 bg-pink-950/40 border border-pink-800/50 px-3 py-1 rounded-xl">
      ${heartsHtml}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function startSpeedrunTimer() {
  currentGame.timerInterval = setInterval(() => {
    currentGame.timeLeft--;
    const timerEl = document.getElementById("speedrun-timer");
    if (timerEl) timerEl.innerText = `${currentGame.timeLeft}s`;

    if (currentGame.timeLeft <= 0) {
      clearInterval(currentGame.timerInterval);
      endGame();
    }
  }, 1000);
}

function nextQuestion() {
  if (currentGame.revealInterval) clearInterval(currentGame.revealInterval);
  currentGame.currentIndex++;
  currentGame.isAnsweringLocked = false;

  const isMusicMode = currentGame.mode.startsWith("music-");
  if ((currentGame.mode === "classic" || currentGame.mode === "image-reveal" || isMusicMode)
      && currentGame.currentIndex > currentGame.questionsCount) {
    endGame();
    return;
  }

  const progressLabel = document.getElementById("game-progress-label");
  if (currentGame.mode === "classic" || currentGame.mode === "image-reveal" || isMusicMode) {
    progressLabel.innerText = `Question ${currentGame.currentIndex} / ${currentGame.questionsCount}`;
    const percent = ((currentGame.currentIndex - 1) / currentGame.questionsCount) * 100;
    document.getElementById("game-bar-fill").style.width = `${percent}%`;
  } else {
    progressLabel.innerText = `Personnage #${currentGame.currentIndex}`;
    document.getElementById("game-bar-fill").style.width = `100%`;
  }

  document.getElementById("game-current-score").innerText = currentGame.score;

  const imgEl = document.getElementById("game-character-image");
  const lang = userProfile.titleLanguage || 'romaji';
  const characterCard = document.getElementById("game-character-card");
  const musicCard = document.getElementById("game-music-card");
  const musicAudio = document.getElementById("game-music-audio");
  const musicVideo = document.getElementById("game-music-video");
  const musicPlayButton = document.getElementById("game-music-play");
  const musicPlayStatus = document.getElementById("game-music-play-status");
  const musicTitle = document.getElementById("game-music-title");
  const questionLabel = document.getElementById("game-question-label");
  let correctAnime;
  let allTitlesForLang;

  if (isMusicMode) {
    const category = currentGame.mode.slice("music-".length);
    const categoryTracks = musicTracks.filter(track => track.category === category);
    const track = categoryTracks[Math.floor(Math.random() * categoryTracks.length)];
    currentGame.activeMusicTrack = track;
    characterCard.classList.add("hidden");
    musicCard.classList.remove("hidden");
    musicAudio.pause();
    musicVideo.pause();
    musicVideo.removeAttribute("src");
    musicAudio.removeAttribute("src");
    if (track.mediaType === "video") {
      musicAudio.classList.add("hidden");
      musicPlayButton.classList.remove("hidden");
      musicPlayButton.innerText = "Écouter l'extrait";
      musicPlayStatus.innerText = "Le quiz masque la vidéo : seul le son est diffusé.";
      musicVideo.src = track.mediaUrl || track.audioUrl;
      musicPlayStatus.classList.remove("hidden");
    } else {
      musicAudio.classList.remove("hidden");
      musicPlayButton.classList.add("hidden");
      musicPlayStatus.classList.add("hidden");
      musicAudio.src = track.mediaUrl || track.audioUrl;
    }
    musicTitle.innerText = track.title;
    musicTitle.classList.add("hidden");
    correctAnime = getMusicAnimeTitle(track, lang);
    questionLabel.innerText = "Écoute l'extrait et devine de quel anime il vient.";
    allTitlesForLang = [
      ...getEffectiveCharacters().map(character => getAnimeTitleByLang(character, lang)),
      ...musicTracks.map(musicTrack => getMusicAnimeTitle(musicTrack, lang))
    ];
  } else {
    const effectivePool = getEffectiveCharacters();
    const randomChar = effectivePool[Math.floor(Math.random() * effectivePool.length)];
    currentGame.activeCharacter = randomChar;
    characterCard.classList.remove("hidden");
    musicCard.classList.add("hidden");
    musicAudio.pause();
    musicVideo.pause();
    musicVideo.removeAttribute("src");
    musicAudio.removeAttribute("src");
    musicTitle.innerText = "";
    imgEl.src = randomChar.image;
    imgEl.style.filter = currentGame.mode === "image-reveal" ? "blur(18px)" : "";
    imgEl.alt = currentGame.mode === "image-reveal" ? "Image mystère d'un anime" : "Personnage";
    imgEl.onerror = () => {
      imgEl.src = "https://s4.anilist.co/file/anilistcdn/character/large/b40-Xy4kZ3oYI96T.png";
    };

    const isImageReveal = currentGame.mode === "image-reveal";
    document.getElementById("game-character-name").innerText = isImageReveal ? "" : randomChar.name;
    questionLabel.innerText = isImageReveal
      ? "L'image se révèle : de quel anime vient-elle ?"
      : "De quel anime vient ce personnage ?";
    correctAnime = getAnimeTitleByLang(randomChar, lang);
    allTitlesForLang = getEffectiveCharacters().map(character => getAnimeTitleByLang(character, lang));
    if (isImageReveal) startImageRevealTimer();
  }

  currentGame.activeCorrectAnime = correctAnime;
  allTitlesForLang = Array.from(new Set(allTitlesForLang.filter(Boolean)));
  allTitlesForLang = allTitlesForLang.concat(lang === 'english' ? EXTRA_TITLES_ENGLISH : EXTRA_TITLES_ROMAJI);

  const wrongOptions = Array.from(new Set(allTitlesForLang.filter(a => a.toLowerCase() !== correctAnime.toLowerCase())));
  const shuffledWrong = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
  const choices = [correctAnime, ...shuffledWrong].sort(() => 0.5 - Math.random());

  const container = document.getElementById("game-options-container");
  container.innerHTML = "";

  choices.forEach(animeTitle => {
    const btn = document.createElement("button");
    btn.className = "w-full py-3.5 px-4 rounded-2xl bg-gray-900/90 hover:bg-purple-950/60 border-2 border-gray-800 hover:border-purple-500 font-bold text-xs sm:text-sm text-gray-200 hover:text-white transition-all text-center flex items-center justify-center min-h-[54px]";
    btn.innerText = animeTitle;
    btn.onclick = () => handleAnswer(animeTitle, btn);
    container.appendChild(btn);
  });

}

function startImageRevealTimer() {
  currentGame.revealSecondsLeft = 10;
  const image = document.getElementById("game-character-image");
  const timer = document.getElementById("image-reveal-timer");
  image.style.filter = "blur(18px)";

  currentGame.revealInterval = setInterval(() => {
    currentGame.revealSecondsLeft--;
    const blur = Math.max(0, currentGame.revealSecondsLeft * 1.8);
    image.style.filter = `blur(${blur}px)`;
    if (timer) timer.innerText = `${currentGame.revealSecondsLeft}s`;
    if (currentGame.revealSecondsLeft <= 0) {
      clearInterval(currentGame.revealInterval);
      currentGame.revealInterval = null;
    }
  }, 1000);
}

function handleAnswer(selectedAnime, clickedBtn) {
  if (currentGame.isAnsweringLocked) return;
  currentGame.isAnsweringLocked = true;
  if (currentGame.revealInterval) {
    clearInterval(currentGame.revealInterval);
    currentGame.revealInterval = null;
  }

  const isCorrect = selectedAnime === currentGame.activeCorrectAnime;
  document.getElementById("game-music-audio").pause();
  document.getElementById("game-music-video").pause();
  document.getElementById("game-music-play").innerText = "Écouter l'extrait";
  if (currentGame.mode.startsWith("music-")) {
    const musicTitle = document.getElementById("game-music-title");
    musicTitle.innerText = `Morceau : ${currentGame.activeMusicTrack.title}`;
    musicTitle.classList.remove("hidden");
  }
  userProfile.stats.totalQuestions++;

  const allBtns = document.getElementById("game-options-container").querySelectorAll("button");

  if (isCorrect) {
    playSound('correct');
    clickedBtn.classList.remove("border-gray-800", "hover:border-purple-500", "bg-gray-900/90");
    clickedBtn.classList.add("bg-emerald-600", "border-emerald-400", "text-white", "pop-anim");

    currentGame.score++;
    userProfile.stats.correctAnswers++;
    userProfile.stats.currentStreak++;

    if (userProfile.stats.currentStreak > userProfile.stats.bestStreak) {
      userProfile.stats.bestStreak = userProfile.stats.currentStreak;
    }

    if (currentGame.mode === "speedrun") {
      currentGame.timeLeft = Math.min(90, currentGame.timeLeft + 2);
      showFloatingText("+2s", clickedBtn);
    }

    if (userProfile.stats.currentStreak % 5 === 0) {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    }

  } else {
    playSound('wrong');
    clickedBtn.classList.remove("border-gray-800", "hover:border-purple-500", "bg-gray-900/90");
    clickedBtn.classList.add("bg-red-600", "border-red-400", "text-white", "shake-anim");

    allBtns.forEach(btn => {
      if (btn.innerText === currentGame.activeCorrectAnime) {
        btn.classList.add("bg-emerald-600/60", "border-emerald-500", "text-white");
      }
    });

    userProfile.stats.currentStreak = 0;

    if (currentGame.mode === "survival") {
      currentGame.lives--;
      updateSurvivalHearts();
      if (currentGame.lives <= 0) {
        setTimeout(endGame, 900);
        return;
      }
    }
  }

  saveProfile();

  setTimeout(() => {
    nextQuestion();
  }, 750);
}

function showFloatingText(txt, targetEl) {
  const span = document.createElement("span");
  span.innerText = txt;
  span.className = "absolute text-amber-400 font-black text-sm animate-bounce-short pointer-events-none";
  targetEl.parentElement.appendChild(span);
  setTimeout(() => span.remove(), 1000);
}

function exitGamePrompt() {
  if (confirm("Voulez-vous quitter la partie en cours ?")) {
    if (currentGame.timerInterval) clearInterval(currentGame.timerInterval);
    if (currentGame.revealInterval) clearInterval(currentGame.revealInterval);
    document.getElementById("game-music-audio").pause();
    showView("home");
  }
}

function endGame() {
  if (currentGame.timerInterval) clearInterval(currentGame.timerInterval);
  if (currentGame.revealInterval) clearInterval(currentGame.revealInterval);
  document.getElementById("game-music-audio").pause();

  userProfile.stats.gamesPlayed++;

  let xpGained = currentGame.score * 25;
  if (currentGame.mode === "speedrun") xpGained += Math.round(currentGame.score * 10);
  if (currentGame.mode === "survival") xpGained += Math.round(currentGame.score * 15);

  const maxPossible = currentGame.mode === "classic"
    || currentGame.mode === "image-reveal"
    || currentGame.mode.startsWith("music-")
    ? currentGame.questionsCount
    : currentGame.currentIndex;

  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1} ${now.getHours()}h${String(now.getMinutes()).padStart(2, '0')}`;
  
  userProfile.history.unshift({
    date: dateStr,
    mode: currentGame.mode.toUpperCase(),
    score: currentGame.score,
    maxScore: maxPossible,
    xpGained: xpGained
  });

  addExperience(xpGained);

  document.getElementById("results-score-count").innerText = `${currentGame.score} / ${maxPossible}`;
  document.getElementById("results-xp-gained").innerText = `+${xpGained} XP`;
  
  let summary = "Belle tentative ! Continuez à vous entraîner.";
  if (currentGame.score >= 8) summary = "Impressionnant ! Vous avez l'œil d'un véritable maître otaku !";
  else if (currentGame.score >= 5) summary = "Pas mal du tout ! Votre culture anime est solide.";
  document.getElementById("results-summary-text").innerText = summary;

  const neededXp = getXpForNextLevel(userProfile.level);
  document.getElementById("results-player-level").innerText = `Niveau ${userProfile.level}`;
  document.getElementById("results-player-xp").innerText = `${userProfile.xp} / ${neededXp} XP`;
  const percentXp = Math.min(100, Math.round((userProfile.xp / neededXp) * 100));
  document.getElementById("results-xp-bar").style.width = `${percentXp}%`;

  showView("results");
}

function restartSameGame() {
  startGame(currentGame.mode);
}

// Administration des personnages
let adminSearchTimeout = null;

async function searchAniListLive() {
  const queryInput = document.getElementById("admin-search-anilist").value.trim();
  const statusEl = document.getElementById("admin-search-status");

  if (!queryInput || queryInput.length < 2) {
    statusEl.innerText = "Entrez au moins 2 lettres.";
    return;
  }

  statusEl.innerText = "Recherche en cours sur AniList...";

  const query = `
    query ($search: String) {
      Character(search: $search) {
        name { full }
        image { large }
        media(sort: POPULARITY_DESC, perPage: 1) {
          nodes {
            title { romaji english }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, variables: { search: queryInput } })
    });
    const json = await res.json();
    const char = json?.data?.Character;

    if (char && char.name?.full) {
      const animeRomaji = char.media?.nodes[0]?.title?.romaji || "";
      const animeEnglish = char.media?.nodes[0]?.title?.english || animeRomaji;
      const imgUrl = char.image?.large || "";

      document.getElementById("admin-char-name").value = char.name.full;
      document.getElementById("admin-char-anime").value = animeRomaji || animeEnglish;
      document.getElementById("admin-char-anime-english").value = animeEnglish;
      document.getElementById("admin-char-image").value = imgUrl;

      const all = getEffectiveCharacters();
      const existing = all.find(c => (c.name || "").trim().toLowerCase() === char.name.full.toLowerCase());

      const statusBadge = existing
        ? `<span class="ml-2 inline-flex items-center space-x-1 bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2.5 py-0.5 rounded-full text-xs font-bold"><i data-lucide="info" class="w-3.5 h-3.5"></i><span>Déjà enregistré (${existing.anime})</span></span>`
        : `<span class="ml-2 inline-flex items-center space-x-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2.5 py-0.5 rounded-full text-xs font-bold"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>Nouveau personnage (pas encore dans vos devinettes)</span></span>`;

      statusEl.innerHTML = `<span class="text-emerald-400 font-bold inline-flex items-center space-x-1.5"><i data-lucide="check" class="w-4 h-4"></i><span>Trouvé : ${char.name.full}</span></span> ${statusBadge}`;
      
      updateAdminPreview();
      if (window.lucide) lucide.createIcons();
    } else {
      statusEl.innerHTML = `<span class="text-amber-400">Aucun personnage trouvé sur AniList avec ce nom.</span>`;
    }
  } catch(err) {
    console.error(err);
    statusEl.innerHTML = `<span class="text-red-400">Erreur lors de la recherche en ligne. Vous pouvez remplir manuellement.</span>`;
  }
}

function updateAdminPreview() {
  const imgUrl = document.getElementById("admin-char-image").value.trim();
  const name = document.getElementById("admin-char-name").value.trim();
  const anime = document.getElementById("admin-char-anime").value.trim();

  const previewImg = document.getElementById("admin-preview-img");
  const previewName = document.getElementById("admin-preview-name");
  const previewAnime = document.getElementById("admin-preview-anime");
  const existsIndicator = document.getElementById("admin-char-exists-indicator");
  const previewPill = document.getElementById("admin-preview-status-pill");
  const submitBtnText = document.getElementById("admin-submit-btn-text");

  previewName.innerText = name || "Nom du Personnage";
  previewAnime.innerText = anime || "Nom de l'Anime";

  if (imgUrl) {
    previewImg.src = imgUrl;
    previewImg.onerror = () => {
      previewImg.src = "https://s4.anilist.co/file/anilistcdn/character/large/b40-Xy4kZ3oYI96T.png";
    };
  } else {
    previewImg.src = "https://s4.anilist.co/file/anilistcdn/character/large/b40-Xy4kZ3oYI96T.png";
  }

  if (!name) {
    if (existsIndicator) existsIndicator.innerHTML = "";
    if (previewPill) previewPill.innerHTML = "";
    if (submitBtnText) submitBtnText.innerText = "Enregistrer le personnage dans le jeu";
    return;
  }

  const all = getEffectiveCharacters();
  const existing = all.find(c => (c.name || "").trim().toLowerCase() === name.toLowerCase());

  if (existing) {
    if (existsIndicator) {
      existsIndicator.innerHTML = `
        <span class="inline-flex items-center space-x-1 font-bold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-lg text-[10px]">
          <i data-lucide="info" class="w-3 h-3"></i>
          <span>Déjà enregistré (${existing.anime})</span>
        </span>
      `;
    }
    if (previewPill) {
      previewPill.innerHTML = `
        <span class="inline-flex items-center space-x-1 font-bold text-amber-400 bg-amber-950/80 border border-amber-700 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
          <i data-lucide="refresh-cw" class="w-3 h-3"></i>
          <span>Déjà dans le jeu</span>
        </span>
      `;
    }
    if (submitBtnText) {
      submitBtnText.innerText = `Mettre à jour "${existing.name}" dans le jeu`;
    }
  } else {
    if (existsIndicator) {
      existsIndicator.innerHTML = `
        <span class="inline-flex items-center space-x-1 font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-lg text-[10px]">
          <i data-lucide="sparkles" class="w-3 h-3"></i>
          <span>Nouveau personnage</span>
        </span>
      `;
    }
    if (previewPill) {
      previewPill.innerHTML = `
        <span class="inline-flex items-center space-x-1 font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
          <i data-lucide="plus" class="w-3 h-3"></i>
          <span>Nouveau personnage</span>
        </span>
      `;
    }
    if (submitBtnText) {
      submitBtnText.innerText = "Ajouter ce nouveau personnage au jeu";
    }
  }

  if (window.lucide) lucide.createIcons();
}

function handleAddCharacterSubmit(e) {
  if (e) e.preventDefault();

  const name = document.getElementById("admin-char-name").value.trim();
  const anime = document.getElementById("admin-char-anime").value.trim();
  const animeEnglish = document.getElementById("admin-char-anime-english").value.trim() || anime;
  const image = document.getElementById("admin-char-image").value.trim();

  if (!name || !anime || !image) {
    alert("Veuillez renseigner le nom, l'anime et l'URL de l'image !");
    return;
  }

  const previousCustomCharacters = customCharacters.slice();
  const wasDeleted = deletedCharacterNames.has(name);
  const existingDeletedNames = new Set(deletedCharacterNames);
  const targetKey = name.toLowerCase();
  const existingIdx = customCharacters.findIndex(c => (c.name || "").trim().toLowerCase() === targetKey);
  const existingCharacter = existingIdx === -1 ? null : customCharacters[existingIdx];

  // Réactive un personnage supprimé.
  if (wasDeleted) {
    deletedCharacterNames.delete(name);
  }

  if (existingIdx !== -1) {
    customCharacters[existingIdx] = {
      name, anime, animeRomaji: anime, animeEnglish, image, addedAt: Date.now()
    };
  } else {
    customCharacters.unshift({
      name, anime, animeRomaji: anime, animeEnglish, image, addedAt: Date.now()
    });
  }

  if (!saveCustomData()) {
    customCharacters = previousCustomCharacters;
    deletedCharacterNames = existingDeletedNames;
    renderAdminCharactersList();
    return;
  }
  showToast(
    existingCharacter
      ? `Personnage "${name}" mis à jour avec succès !`
      : `Nouveau personnage "${name}" ajouté aux devinettes !`,
    existingCharacter ? "check" : "sparkles"
  );

  document.getElementById("admin-char-name").value = "";
  document.getElementById("admin-char-anime").value = "";
  document.getElementById("admin-char-anime-english").value = "";
  document.getElementById("admin-char-image").value = "";
  document.getElementById("admin-search-anilist").value = "";
  document.getElementById("admin-search-status").innerText = "";
  updateAdminPreview();

  renderAdminCharactersList();
}

function deleteCharacter(name) {
  if (!confirm(`Supprimer définitivement "${name}" des devinettes ?`)) return;

  const targetKey = name.trim().toLowerCase();
  const previousCustomCharacters = customCharacters.slice();
  const previousDeletedNames = new Set(deletedCharacterNames);

  customCharacters = customCharacters.filter(c => (c.name || "").trim().toLowerCase() !== targetKey);

  deletedCharacterNames.add(name);
  if (!saveCustomData()) {
    customCharacters = previousCustomCharacters;
    deletedCharacterNames = previousDeletedNames;
    renderAdminCharactersList();
    return;
  }

  renderAdminCharactersList();
  showToast(`"${name}" a été retiré du jeu.`, "trash-2");
}

function editCharacter(name) {
  const all = getEffectiveCharacters();
  const char = all.find(c => (c.name || "").trim().toLowerCase() === name.trim().toLowerCase());
  if (!char) return;

  document.getElementById("admin-char-name").value = char.name;
  document.getElementById("admin-char-anime").value = char.animeRomaji || char.anime;
  document.getElementById("admin-char-anime-english").value = char.animeEnglish || char.anime;
  document.getElementById("admin-char-image").value = char.image;
  updateAdminPreview();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Vous modifiez "${char.name}".`, "edit-3");
}

function clearAllCharacters() {
  if (!confirm("Vider toute la base de personnages ? Tous les personnages intégrés et ajoutés seront supprimés. Le quiz restera vide, même après rechargement.")) {
    return;
  }

  const previousCustomCharacters = customCharacters;
  const previousDeletedNames = deletedCharacterNames;
  const previousResetState = resetCharacterCatalog;

  customCharacters = [];
  deletedCharacterNames = new Set();
  resetCharacterCatalog = true;
  if (!saveCustomData()) {
    customCharacters = previousCustomCharacters;
    deletedCharacterNames = previousDeletedNames;
    resetCharacterCatalog = previousResetState;
    return;
  }

  renderAdminCharactersList();
  updateAdminPreview();
  showToast("Tous les personnages ont été supprimés du quiz.", "trash-2");
}

function renderAdminCharactersList() {
  const container = document.getElementById("admin-characters-table");
  const countBadge = document.getElementById("admin-total-chars-count");
  if (!container) return;

  const all = getEffectiveCharacters();
  if (countBadge) {
    countBadge.innerText = `${all.length} personnage${all.length === 1 ? "" : "s"}`;
  }

  const searchFilter = (document.getElementById("admin-filter-input")?.value || "").toLowerCase().trim();

  const filtered = all.filter(c => {
    return !searchFilter || c.name.toLowerCase().includes(searchFilter)
      || (c.animeRomaji || c.anime || "").toLowerCase().includes(searchFilter)
      || (c.animeEnglish || "").toLowerCase().includes(searchFilter);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-gray-500 text-sm">${
      all.length === 0
        ? "La base est vide. Ajoute des personnages avec le formulaire ci-dessus."
        : "Aucun personnage correspondant."
    }</div>`;
    return;
  }

  container.innerHTML = filtered.map((c, index) => {
    const romajiTitle = c.animeRomaji || c.anime || "";
    const englishTitle = c.animeEnglish || c.anime || romajiTitle;
    return `
      <div class="flex items-center justify-between p-3.5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition">
        <div class="flex items-center space-x-3.5">
          <img src="${escapeHTML(c.image)}" alt="${escapeHTML(c.name)}" class="w-12 h-12 rounded-xl object-cover border border-gray-700 bg-gray-950 flex-shrink-0" onerror="this.src='https://s4.anilist.co/file/anilistcdn/character/large/b40-Xy4kZ3oYI96T.png'">
          <div>
            <div class="text-sm font-bold text-white">${escapeHTML(c.name)}</div>
            <div class="text-xs text-purple-400 font-medium">${escapeHTML(romajiTitle)}</div>
            <div class="text-[10px] text-gray-500">${escapeHTML(englishTitle)}</div>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <button onclick="editCharacter(this.dataset.name)" data-name="${escapeHTML(c.name)}" class="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition" title="Modifier">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteCharacter(this.dataset.name)" data-name="${escapeHTML(c.name)}" class="p-2 rounded-xl bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-red-200 transition border border-red-900/50" title="Supprimer">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function setAdminSection(section) {
  const isMusic = section === "music";
  document.getElementById("admin-panel-characters").classList.toggle("hidden", isMusic);
  document.getElementById("admin-panel-music").classList.toggle("hidden", !isMusic);

  document.getElementById("admin-tab-characters").className = isMusic
    ? "admin-tab px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-bold"
    : "admin-tab px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold";
  document.getElementById("admin-tab-music").className = isMusic
    ? "admin-tab px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold"
    : "admin-tab px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-bold";

  if (isMusic) renderAdminMusicList();
}

async function searchAnimeThemes(event) {
  event.preventDefault();
  const query = document.getElementById("admin-theme-search").value.trim();
  const typeFilter = document.getElementById("admin-theme-search-type").value;
  const status = document.getElementById("admin-theme-search-status");
  const results = document.getElementById("admin-theme-search-results");
  const requestId = ++animeThemeSearchRequest;

  animeThemeResults = [];
  results.innerHTML = "";
  if (typeFilter !== "opening" && typeFilter !== "ending" && typeFilter !== "all") {
    status.innerText = "Type de thème invalide.";
    return;
  }
  if (query.length < 2) {
    status.innerText = "Saisis au moins deux caractères.";
    return;
  }

  status.innerText = "Recherche des animes dans AnimeThemes...";
  try {
    const searchUrl = new URL("https://api.animethemes.moe/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("page[limit]", "8");
    const response = await fetch(searchUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`AnimeThemes a répondu avec le statut ${response.status}.`);
    const payload = await response.json();
    const animeResults = payload?.search?.anime;
    if (!Array.isArray(animeResults)) {
      throw new TypeError("La réponse de recherche AnimeThemes n'a pas le format attendu.");
    }

    if (requestId !== animeThemeSearchRequest) return;
    const validAnime = animeResults.filter(anime =>
      Number.isInteger(anime.id) && typeof anime.slug === "string" && typeof anime.name === "string"
    );
    if (!validAnime.length) {
      status.innerText = "Aucun anime trouvé. Essaie un autre titre.";
      return;
    }

    status.innerText = `${validAnime.length} résultat${validAnime.length === 1 ? "" : "s"} : choisis un anime pour charger ses thèmes.`;
    results.innerHTML = validAnime.map(anime => `
      <button type="button" data-anime-slug="${escapeHTML(anime.slug)}" class="text-left rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-purple-500 transition">
        <span class="block text-sm font-bold text-white">${escapeHTML(anime.name)}</span>
        <span class="block mt-1 text-[11px] text-gray-500">${anime.year ? escapeHTML(anime.year) : ""} · Charger les openings/endings</span>
      </button>
    `).join("");
    results.querySelectorAll("[data-anime-slug]").forEach(button => {
      button.addEventListener("click", () => loadAnimeThemeResults(button.dataset.animeSlug));
    });
  } catch (error) {
    console.error("Erreur de recherche AnimeThemes :", error);
    if (requestId === animeThemeSearchRequest) {
      status.innerText = "La recherche a échoué. Vérifie ta connexion et réessaie.";
    }
  }
}

async function loadAnimeThemeResults(animeSlug) {
  const status = document.getElementById("admin-theme-search-status");
  const results = document.getElementById("admin-theme-search-results");
  const typeFilter = document.getElementById("admin-theme-search-type").value;
  const requestId = ++animeThemeSearchRequest;
  const safeSlug = String(animeSlug || "");

  if (!/^[a-zA-Z0-9_-]+$/.test(safeSlug)) {
    status.innerText = "L'identifiant de l'anime reçu est invalide.";
    return;
  }

  status.innerText = "Chargement des thèmes et des aperçus...";
  results.innerHTML = "";
  try {
    const detailUrl = new URL(`https://api.animethemes.moe/anime/${encodeURIComponent(safeSlug)}`);
    detailUrl.searchParams.set("include", "animethemes.song,animethemes.animethemeentries.videos");
    const response = await fetch(detailUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`AnimeThemes a répondu avec le statut ${response.status}.`);
    const payload = await response.json();
    const anime = payload?.anime;
    if (!anime || !Array.isArray(anime.animethemes)) {
      throw new TypeError("La fiche AnimeThemes ne contient pas les thèmes attendus.");
    }

    const themes = [];
    anime.animethemes.forEach(theme => {
      const category = theme.type === "OP" ? "opening" : theme.type === "ED" ? "ending" : null;
      if (!category || (typeFilter !== "all" && category !== typeFilter)) return;
      (theme.animethemeentries || []).forEach(entry => {
        if (entry.spoiler || entry.nsfw) return;
        const video = (entry.videos || [])
          .filter(candidate => {
            try {
              const url = new URL(candidate.link);
              return url.protocol === "https:" && url.hostname === "v.animethemes.moe";
            } catch {
              return false;
            }
          })
          .sort((a, b) => (a.resolution || 9999) - (b.resolution || 9999))[0];
        if (!video) return;
        themes.push({
          id: `${theme.id}-${entry.id}-${video.id}`,
          apiThemeId: theme.id,
          category,
          title: theme.song?.title || `${theme.type}${theme.sequence || ""}`,
          animeName: anime.name,
          animeSlug: anime.slug,
          videoUrl: video.link,
          resolution: video.resolution
        });
      });
    });

    if (requestId !== animeThemeSearchRequest) return;
    animeThemeResults = themes.slice(0, 20);
    if (!animeThemeResults.length) {
      status.innerText = "Aucun thème avec aperçu vidéo trouvé dans cette catégorie.";
      return;
    }
    status.innerText = `${animeThemeResults.length} thème${animeThemeResults.length === 1 ? "" : "s"} trouvé${animeThemeResults.length === 1 ? "" : "s"} pour ${anime.name}. Préécoute puis ajoute ceux que tu veux.`;
    renderAnimeThemeResults();
  } catch (error) {
    console.error("Erreur de chargement des thèmes AnimeThemes :", error);
    if (requestId === animeThemeSearchRequest) {
      status.innerText = "Impossible de charger les thèmes de cet anime. Réessaie plus tard.";
    }
  }
}

function renderAnimeThemeResults() {
  const results = document.getElementById("admin-theme-search-results");
  results.innerHTML = animeThemeResults.map(theme => {
    const id = escapeHTML(theme.id);
    const title = escapeHTML(theme.title);
    const category = theme.category === "opening" ? "OPENING" : "ENDING";
    const videoUrl = escapeHTML(theme.videoUrl);
    const sourceUrl = `https://animethemes.moe/anime/${encodeURIComponent(theme.animeSlug)}`;
    return `
      <article class="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded-md bg-purple-950 text-purple-300 text-[10px] font-bold">${category}</span>
            <h4 class="text-sm font-bold text-white">${title}</h4>
          </div>
          <p class="mt-1 text-xs text-gray-400">${escapeHTML(theme.animeName)}${theme.resolution ? ` · ${escapeHTML(theme.resolution)}p` : ""}</p>
        </div>
        <video controls preload="none" playsinline src="${videoUrl}" class="w-full max-h-48 rounded-lg bg-black" aria-label="Aperçu de ${title}"></video>
        <div class="flex items-center justify-between gap-3">
          <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-purple-300 underline">Voir sur AnimeThemes</a>
          <button type="button" data-theme-id="${id}" class="rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-2 text-xs font-bold text-white">Ajouter au quiz</button>
        </div>
      </article>
    `;
  }).join("");
  results.querySelectorAll("[data-theme-id]").forEach(button => {
    button.addEventListener("click", () => importAnimeTheme(button.dataset.themeId, button));
  });
  if (window.lucide) lucide.createIcons();
}

async function lookupAnimeTitles(animeName) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title { romaji english }
      }
    }
  `;
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables: { search: animeName } })
  });
  if (!response.ok) throw new Error(`AniList a répondu avec le statut ${response.status}.`);
  const payload = await response.json();
  const titles = payload?.data?.Media?.title;
  if (!titles?.romaji && !titles?.english) {
    throw new Error("AniList n'a pas trouvé de titres bilingues pour cet anime.");
  }
  const fallback = titles.romaji || titles.english;
  return {
    animeRomaji: titles.romaji || fallback,
    animeEnglish: titles.english || fallback
  };
}

async function importAnimeTheme(themeId, button) {
  const theme = animeThemeResults.find(result => result.id === themeId);
  if (!theme) {
    showToast("Ce thème n'est plus dans les résultats. Relance la recherche.", "triangle-alert");
    return;
  }
  if (musicTracks.some(track => track.sourceThemeId === theme.id)) {
    showToast("Ce thème est déjà dans la bibliothèque.", "info");
    return;
  }

  button.disabled = true;
  button.innerText = "Ajout...";
  let titles = { animeRomaji: theme.animeName, animeEnglish: theme.animeName };
  try {
    titles = await lookupAnimeTitles(theme.animeName);
  } catch (error) {
    console.warn("AniList ne fournit pas de titres bilingues pour cet anime :", error);
  }

  const track = {
    id: `animethemes-${theme.id}`,
    category: theme.category,
    title: theme.title,
    ...titles,
    mediaUrl: theme.videoUrl,
    mediaType: "video",
    source: "AnimeThemes",
    sourceThemeId: theme.id,
    sourceUrl: `https://animethemes.moe/anime/${theme.animeSlug}`,
    addedAt: Date.now()
  };
  musicTracks.unshift(track);
  if (!saveMusicTracks()) {
    musicTracks = musicTracks.filter(item => item.id !== track.id);
    button.disabled = false;
    button.innerText = "Ajouter au quiz";
    return;
  }

  button.innerText = "Ajouté";
  renderAdminMusicList();
  refreshHomeMusicModes();
  showToast(`« ${theme.title} » ajouté au quiz.`, "music-2");
}

function handleAddMusicSubmit(event) {
  event.preventDefault();

  const category = document.getElementById("admin-music-category").value;
  const title = document.getElementById("admin-music-title").value.trim();
  const animeRomaji = document.getElementById("admin-music-anime-romaji").value.trim();
  const animeEnglish = document.getElementById("admin-music-anime-english").value.trim();
  const audioUrl = document.getElementById("admin-music-url").value.trim();

  if (!isMusicCategory(category) || !title || !animeRomaji || !animeEnglish || !audioUrl) {
    showToast("Complète tous les champs de l'extrait audio.", "triangle-alert");
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(audioUrl);
  } catch (error) {
    showToast("L'URL audio n'est pas valide.", "triangle-alert");
    return;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    showToast("L'URL audio doit utiliser HTTP ou HTTPS.", "triangle-alert");
    return;
  }

  const track = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    title,
    animeRomaji,
    animeEnglish,
    mediaUrl: parsedUrl.href,
    mediaType: "audio",
    addedAt: Date.now()
  };
  musicTracks.unshift(track);
  if (!saveMusicTracks()) {
    musicTracks = musicTracks.filter(item => item.id !== track.id);
    return;
  }

  event.target.reset();
  renderAdminMusicList();
  refreshHomeMusicModes();
  showToast(`Extrait « ${title} » ajouté.`, "music-2");
}

function deleteMusicTrack(trackId) {
  const trackIndex = musicTracks.findIndex(track => track.id === trackId);
  if (trackIndex === -1) return;
  const [removedTrack] = musicTracks.splice(trackIndex, 1);
  if (!saveMusicTracks()) {
    musicTracks.splice(trackIndex, 0, removedTrack);
    return;
  }

  renderAdminMusicList();
  refreshHomeMusicModes();
  showToast(`Extrait « ${removedTrack.title} » supprimé.`, "trash-2");
}

function renderAdminMusicList() {
  const container = document.getElementById("admin-music-list");
  if (!container) return;

  const countBadge = document.getElementById("admin-total-music-count");
  if (countBadge) {
    const count = musicTracks.length;
    countBadge.innerText = `${count} musique${count === 1 ? "" : "s"}`;
  }

  const filter = document.getElementById("admin-music-filter")?.value || "all";
  const filteredTracks = musicTracks.filter(track => filter === "all" || track.category === filter);
  if (!filteredTracks.length) {
    container.innerHTML = `<p class="py-8 text-center text-sm text-gray-500">${
      musicTracks.length ? "Aucun extrait dans cette catégorie." : "Aucun extrait audio. Ajoute-en un avec le formulaire ci-dessus."
    }</p>`;
    return;
  }

  container.innerHTML = filteredTracks.map(track => {
    const category = escapeHTML(track.category.toUpperCase());
    const title = escapeHTML(track.title);
    const romaji = escapeHTML(track.animeRomaji);
    const english = escapeHTML(track.animeEnglish);
    const mediaUrl = escapeHTML(track.mediaUrl || track.audioUrl);
    const id = escapeHTML(track.id);
    const preview = track.mediaType === "video"
      ? `<video controls preload="none" playsinline src="${mediaUrl}" class="w-full sm:w-56 max-h-36 rounded-lg bg-black" aria-label="Préécoute de ${title}"></video>`
      : `<audio controls preload="none" src="${mediaUrl}" class="w-full sm:w-56"></audio>`;
    const sourceLink = track.sourceUrl
      ? `<a href="${escapeHTML(track.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="text-[10px] text-purple-300 underline">Source : ${escapeHTML(track.source || "externe")}</a>`
      : "";
    return `
      <article class="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2 py-1 rounded-md bg-purple-950 text-purple-300 text-[10px] font-bold">${category}</span>
            <h4 class="text-sm font-bold text-white">${title}</h4>
          </div>
          <p class="mt-1 text-xs text-gray-400">Romaji : ${romaji} <span class="text-gray-600">·</span> Anglais : ${english}</p>
          ${sourceLink}
        </div>
        ${preview}
        <button type="button" onclick="deleteMusicTrack('${id}')" aria-label="Supprimer ${title}" class="p-2 self-end sm:self-auto rounded-lg bg-red-950/40 hover:bg-red-900 text-red-400 border border-red-900/50">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </article>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

// Navigation
function showView(viewId) {
  const musicAudio = document.getElementById("game-music-audio");
  if (viewId !== "game" && musicAudio) musicAudio.pause();

  const views = ["home", "game", "results", "profile", "leaderboard", "admin"];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add("hidden");
  });

  const targetEl = document.getElementById(`view-${viewId}`);
  if (targetEl) targetEl.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("bg-purple-600", "text-white", "shadow-lg", "shadow-purple-600/30");
    btn.classList.add("text-gray-400");
  });

  const activeBtn = document.getElementById(`nav-${viewId}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-gray-400");
    activeBtn.classList.add("bg-purple-600", "text-white", "shadow-lg", "shadow-purple-600/30");
  }

  if (viewId === "profile") updateProfileUI();
  if (viewId === "leaderboard") renderLeaderboard();
  if (viewId === "admin") {
    renderAdminCharactersList();
    renderAdminMusicList();
  }
  if (window.lucide) lucide.createIcons();
}

// Classement
function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  const topPlayers = [
    { name: "LeviAckerman99", level: 32, streak: 45, title: "Hokage Suprême", avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b45627-2S1q2s3Z3Udf.png" },
    { name: "Gojo_Domain", level: 28, streak: 38, title: "Seigneur Pirate", avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b16498-y2xZt2G6iW6R.png" },
    { name: "FrierenSpell", level: 24, streak: 31, title: "Chasseur de Fléaux", avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b124381-eG9Zl60vK0Yf.png" },
    { name: userProfile.username + " (Vous)", level: userProfile.level, streak: userProfile.stats.bestStreak, title: userProfile.title, avatar: userProfile.avatar, isUser: true },
    { name: "AnyaPeanuts", level: 12, streak: 18, title: "Capitaine du Bataillon", avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b137079-qYw4c6z8w9aL.png" },
    { name: "TanjiroWater", level: 8, streak: 14, title: "Initié Confirmé", avatar: "https://s4.anilist.co/file/anilistcdn/character/large/b88572-1kZ3f5u8Z2rT.png" }
  ];

  topPlayers.sort((a, b) => b.level - a.level);

  container.innerHTML = topPlayers.map((p, idx) => `
    <div class="flex items-center justify-between p-3.5 rounded-2xl ${p.isUser ? 'bg-purple-950/40 border-2 border-purple-500/60' : 'bg-gray-900 border border-gray-800'} transition">
      <div class="flex items-center space-x-3.5">
        <span class="w-6 text-center font-black text-sm ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}">
          #${idx + 1}
        </span>
        <img src="${p.avatar}" class="w-10 h-10 rounded-xl object-cover border border-purple-500/30">
        <div>
          <div class="text-sm font-bold text-white flex items-center space-x-2">
            <span>${p.name}</span>
          </div>
          <div class="text-[10px] text-purple-300">${p.title}</div>
        </div>
      </div>
      <div class="flex items-center space-x-6 text-right">
        <div>
          <div class="text-xs font-black text-amber-400">Niv. ${p.level}</div>
          <div class="text-[10px] text-gray-500 flex items-center justify-end space-x-1">
            <span>Record</span>
            <i data-lucide="flame" class="w-3 h-3 text-amber-400"></i>
            <span>${p.streak}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

// Avatars
function openAvatarModal() {
  const modal = document.getElementById("avatar-modal");
  const grid = document.getElementById("avatar-selection-grid");
  const all = getEffectiveCharacters();
  
  grid.innerHTML = all.slice(0, 16).map(char => `
    <div onclick="selectAvatar('${char.image}')" class="group relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-800 hover:border-purple-500 cursor-pointer transition">
      <img src="${char.image}" class="w-full h-full object-cover group-hover:scale-110 transition">
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
        <span class="text-[9px] font-bold text-white truncate">${char.name}</span>
      </div>
    </div>
  `).join('');

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function selectAvatar(url) {
  userProfile.avatar = url;
  saveProfile();
  closeAvatarModal();
  showToast("Avatar mis à jour !", "check");
}

function closeAvatarModal() {
  const modal = document.getElementById("avatar-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

// Notifications
function showToast(msg, icon = "sparkles") {
  const toast = document.getElementById("game-toast");
  if (!toast) return;

  document.getElementById("toast-text").innerText = msg;
  const iconEl = document.getElementById("toast-icon");
  if (iconEl) {
    iconEl.setAttribute("data-lucide", icon);
    if (window.lucide) lucide.createIcons();
  }

  toast.classList.remove("translate-y-24", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-24", "opacity-0");
  }, 3000);
}

// Initialisation
window.addEventListener("DOMContentLoaded", () => {
  loadCustomData();
  loadMusicTracks();
  loadProfile();
  refreshHomeMusicModes();
  renderAdminMusicList();
  document.addEventListener("error", event => {
    if (event.target instanceof HTMLMediaElement) {
      showToast("Impossible de lire ce média. Vérifie sa disponibilité à la source.", "triangle-alert");
    }
  }, true);
  if (typeof fetchOnlineCharacters === 'function') {
    fetchOnlineCharacters();
  }
  if (window.lucide) lucide.createIcons();
});
