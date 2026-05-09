const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const themeToggle = document.getElementById("themeToggle");
const backToTop = document.getElementById("backToTop");
const revealElements = document.querySelectorAll(".reveal");
const yearSpan = document.getElementById("year");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxItems = document.querySelectorAll(".lightbox-item");
const ownerPanel = document.getElementById("ownerPanel");
const ownerStatus = document.getElementById("ownerStatus");
const ownerUnlockBtn = document.getElementById("ownerUnlockBtn");
const ownerLockBtn = document.getElementById("ownerLockBtn");
const editableElements = document.querySelectorAll(".editable");
const heroSection = document.querySelector(".hero");

// Change this passcode to your own private code.
const OWNER_PASSCODE = "tour2026";
const OWNER_STORAGE_KEY = "tourBlogOwnerUnlocked";
const EDITABLE_CONTENT_KEY = "tourBlogEditableContent";
const IMAGE_CONTENT_KEY = "tourBlogImageContent";
const HERO_IMAGE_KEY = "tourBlogHeroImage";
const REMOTE_CONTENT_KEY = "tourBlogRemoteContent";
const DEFAULT_BUCKET = "tour-files";
const DEFAULT_TABLE = "site_content";
const DEFAULT_ROW_ID = "main";

const params = new URLSearchParams(window.location.search);
const isOwnerUrl =
  params.get("owner") === "1" ||
  params.get("private") === "1" ||
  params.get("edit") === "1";
const hasOwnerSession = sessionStorage.getItem(OWNER_STORAGE_KEY) === "true";
let ownerUnlocked = false;
let supabaseClient = null;
let isCloudEnabled = false;

const remoteConfig = {
  url: window.__SUPABASE_CONFIG__?.url || "",
  anonKey: window.__SUPABASE_CONFIG__?.anonKey || "",
  bucket: window.__SUPABASE_CONFIG__?.bucket || DEFAULT_BUCKET,
  table: window.__SUPABASE_CONFIG__?.table || DEFAULT_TABLE,
  rowId: window.__SUPABASE_CONFIG__?.rowId || DEFAULT_ROW_ID,
};

// Owner mode is now controlled by the navbar button, not by default visibility
// document.body.classList.add("owner-visible");

const setEditableState = (enabled) => {
  editableElements.forEach((el) => {
    el.setAttribute("contenteditable", enabled ? "true" : "false");
  });
};

const getEditableKey = (index) => `editable-${index}`;

const loadEditableContentFromLocal = () => {
  const raw = localStorage.getItem(EDITABLE_CONTENT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const saveEditableContentToLocal = (editableContent) => {
  localStorage.setItem(EDITABLE_CONTENT_KEY, JSON.stringify(editableContent));
};

const getEditableContentFromDom = () => {
  const next = {};
  editableElements.forEach((el, index) => {
    next[getEditableKey(index)] = el.innerHTML;
  });
  return next;
};

const buildImageElement = (src, alt = "Tour photo") => {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.classList.add("lightbox-item");
  return img;
};

const saveImageContent = () => {
  const timelineGalleries = Array.from(document.querySelectorAll(".timeline-card .image-gallery")).map((gallery) =>
    Array.from(gallery.querySelectorAll("img")).map((img) => ({
      src: img.src,
      alt: img.alt || "Tour photo",
    }))
  );

  const masonryGallery = Array.from(document.querySelectorAll(".masonry-gallery img")).map((img) => ({
    src: img.src,
    alt: img.alt || "Travel memory",
  }));

  localStorage.setItem(
    IMAGE_CONTENT_KEY,
    JSON.stringify({
      timelineGalleries,
      masonryGallery,
    })
  );
};

const loadImageContent = () => {
  const raw = localStorage.getItem(IMAGE_CONTENT_KEY);
  if (!raw) return;

  try {
    const saved = JSON.parse(raw);
    const timelineGalleries = document.querySelectorAll(".timeline-card .image-gallery");

    if (Array.isArray(saved.timelineGalleries)) {
      timelineGalleries.forEach((gallery, index) => {
        const images = saved.timelineGalleries[index];
        if (!Array.isArray(images) || images.length === 0) return;

        gallery.innerHTML = "";
        images.forEach((item) => {
          if (!item || typeof item.src !== "string") return;
          gallery.appendChild(buildImageElement(item.src, item.alt || "Tour photo"));
        });
      });
    }

    const masonryRoot = document.querySelector(".masonry-gallery");
    if (masonryRoot && Array.isArray(saved.masonryGallery) && saved.masonryGallery.length > 0) {
      masonryRoot.innerHTML = "";
      saved.masonryGallery.forEach((item) => {
        if (!item || typeof item.src !== "string") return;
        masonryRoot.appendChild(buildImageElement(item.src, item.alt || "Travel memory"));
      });
    }
  } catch (error) {
    // Ignore invalid stored data and keep default content.
  }
};

const getHeroImageFromDom = () => {
  if (!heroSection) return "";
  const computed = window.getComputedStyle(heroSection).backgroundImage;
  if (!computed || computed === "none") return "";
  const match = computed.match(/url\(["']?(.*?)["']?\)/);
  return match ? match[1] : "";
};

const getImageContentFromDom = () => {
  const timelineGalleries = Array.from(document.querySelectorAll(".timeline-card .image-gallery")).map((gallery) =>
    Array.from(gallery.querySelectorAll("img")).map((img) => ({
      src: img.src,
      alt: img.alt || "Tour photo",
    }))
  );

  const masonryGallery = Array.from(document.querySelectorAll(".masonry-gallery img")).map((img) => ({
    src: img.src,
    alt: img.alt || "Travel memory",
  }));

  return { timelineGalleries, masonryGallery };
};

const getContentSnapshot = () => {
  const imageContent = getImageContentFromDom();

  return {
    editableContent: getEditableContentFromDom(),
    timelineGalleries: imageContent.timelineGalleries,
    masonryGallery: imageContent.masonryGallery,
    heroImage: localStorage.getItem(HERO_IMAGE_KEY) || getHeroImageFromDom(),
  };
};

const applyEditableContent = (editableContent) => {
  if (!editableContent || typeof editableContent !== "object") return;
  editableElements.forEach((el, index) => {
    const key = getEditableKey(index);
    if (typeof editableContent[key] === "string") {
      el.innerHTML = editableContent[key];
    }
  });
};

const applyHeroImage = (src) => {
  if (!heroSection || !src) return;
  heroSection.style.backgroundImage = `url("${src}")`;
};

const applyRemoteSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") return;

  applyEditableContent(snapshot.editableContent);

  if (
    Array.isArray(snapshot.timelineGalleries) ||
    Array.isArray(snapshot.masonryGallery)
  ) {
    localStorage.setItem(
      IMAGE_CONTENT_KEY,
      JSON.stringify({
        timelineGalleries: Array.isArray(snapshot.timelineGalleries) ? snapshot.timelineGalleries : [],
        masonryGallery: Array.isArray(snapshot.masonryGallery) ? snapshot.masonryGallery : [],
      })
    );
    loadImageContent();
  }

  if (typeof snapshot.heroImage === "string" && snapshot.heroImage) {
    localStorage.setItem(HERO_IMAGE_KEY, snapshot.heroImage);
    applyHeroImage(snapshot.heroImage);
  }
};

const canUseCloud = () => {
  const hasLib = Boolean(window.supabase && typeof window.supabase.createClient === "function");
  const hasConfig = Boolean(remoteConfig.url && remoteConfig.anonKey);
  return hasLib && hasConfig;
};

const initCloudClient = () => {
  if (!canUseCloud()) return;
  supabaseClient = window.supabase.createClient(remoteConfig.url, remoteConfig.anonKey);
  isCloudEnabled = true;
};

const saveRemoteSnapshot = async (snapshot) => {
  if (!isCloudEnabled || !supabaseClient) return;
  const payload = {
    id: remoteConfig.rowId,
    content: snapshot,
    updated_at: new Date().toISOString(),
  };
  await supabaseClient.from(remoteConfig.table).upsert(payload, { onConflict: "id" });
  localStorage.setItem(REMOTE_CONTENT_KEY, JSON.stringify(snapshot));
};

const loadRemoteSnapshot = async () => {
  if (!isCloudEnabled || !supabaseClient) return null;
  const { data, error } = await supabaseClient
    .from(remoteConfig.table)
    .select("content")
    .eq("id", remoteConfig.rowId)
    .maybeSingle();

  if (error || !data || !data.content) return null;
  localStorage.setItem(REMOTE_CONTENT_KEY, JSON.stringify(data.content));
  return data.content;
};

const saveAllContent = async () => {
  const snapshot = getContentSnapshot();
  saveEditableContentToLocal(snapshot.editableContent);
  localStorage.setItem(
    IMAGE_CONTENT_KEY,
    JSON.stringify({
      timelineGalleries: snapshot.timelineGalleries,
      masonryGallery: snapshot.masonryGallery,
    })
  );
  if (snapshot.heroImage) {
    localStorage.setItem(HERO_IMAGE_KEY, snapshot.heroImage);
  }

  if (isCloudEnabled) {
    try {
      await saveRemoteSnapshot(snapshot);
    } catch (error) {
      // Local cache already saved; ignore cloud failures to keep editor responsive.
    }
  }
};

const uploadFileToCloud = async (file, folder) => {
  if (!isCloudEnabled || !supabaseClient) return null;
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabaseClient.storage.from(remoteConfig.bucket).upload(filePath, file, {
    upsert: false,
  });
  if (error) return null;
  const { data } = supabaseClient.storage.from(remoteConfig.bucket).getPublicUrl(filePath);
  return data?.publicUrl || null;
};

const setOwnerState = (enabled) => {
  ownerUnlocked = enabled;
  if (enabled) {
    document.body.classList.add("owner-unlocked");
    sessionStorage.setItem(OWNER_STORAGE_KEY, "true");
    if (ownerStatus) ownerStatus.textContent = "Unlocked";
  } else {
    document.body.classList.remove("owner-unlocked");
    sessionStorage.removeItem(OWNER_STORAGE_KEY);
    if (ownerStatus) ownerStatus.textContent = "Locked";
  }
  setEditableState(enabled);
};

setOwnerState(hasOwnerSession);
const localEditable = loadEditableContentFromLocal();
applyEditableContent(localEditable);

editableElements.forEach((el) => {
  el.addEventListener("input", () => {
    saveAllContent();
  });
  el.addEventListener("blur", () => {
    saveAllContent();
  });
});

if (ownerUnlockBtn) {
  ownerUnlockBtn.addEventListener("click", () => {
    const entered = window.prompt("Enter owner passcode:");
    if (entered === OWNER_PASSCODE) {
      setOwnerState(true);
      window.alert("Owner mode unlocked. You can now edit text and upload images.");
    } else if (entered !== null) {
      window.alert("Incorrect passcode.");
    }
  });
}

if (ownerLockBtn) {
  ownerLockBtn.addEventListener("click", () => {
    setOwnerState(false);
    closeOwnerPanel();
  });
}

// Owner mode panel toggle
const ownerModeBtn = document.getElementById("ownerModeBtn");
const ownerPanelBackdrop = document.getElementById("ownerPanelBackdrop");

const toggleOwnerPanel = () => {
  document.body.classList.toggle("owner-panel-open");
};

const closeOwnerPanel = () => {
  document.body.classList.remove("owner-panel-open");
};

if (ownerModeBtn) {
  ownerModeBtn.addEventListener("click", toggleOwnerPanel);
}

if (ownerPanelBackdrop) {
  ownerPanelBackdrop.addEventListener("click", closeOwnerPanel);
}

const attachUploadControlToImage = (img) => {
  const parent = img.parentElement;
  if (!parent || parent.classList.contains("image-wrap")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "image-wrap";
  parent.insertBefore(wrapper, img);
  wrapper.appendChild(img);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "owner-upload-btn";
  button.textContent = "Upload";
  wrapper.appendChild(button);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.style.display = "none";
  wrapper.appendChild(input);

  button.addEventListener("click", () => {
    if (!ownerUnlocked) return;
    input.click();
  });

  input.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !ownerUnlocked) return;
    const reader = new FileReader();
    const cloudUrl = await uploadFileToCloud(file, "gallery");
    if (cloudUrl) {
      img.src = cloudUrl;
      saveImageContent();
      saveAllContent();
      return;
    }

    reader.onload = () => {
      img.src = String(reader.result);
      saveImageContent();
      saveAllContent();
    };
    reader.readAsDataURL(file);
  });
};

const addUploadButtonsToImages = () => {
  const imageTargets = document.querySelectorAll(".image-gallery img, .masonry-gallery img");
  imageTargets.forEach((img) => attachUploadControlToImage(img));
};

const addMoreButtonsToTimelineCards = () => {
  const timelineCards = document.querySelectorAll(".timeline-card");
  timelineCards.forEach((card) => {
    const gallery = card.querySelector(".image-gallery");
    if (!gallery || card.querySelector(".owner-add-more-btn")) return;

    const createPhotoSlot = () => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "owner-photo-slot";
      slot.textContent = "+ Add Photo";
      gallery.appendChild(slot);

      const slotInput = document.createElement("input");
      slotInput.type = "file";
      slotInput.accept = "image/*";
      slotInput.style.display = "none";
      gallery.appendChild(slotInput);

      slot.addEventListener("click", () => {
        if (!ownerUnlocked) return;
        slotInput.click();
      });

      slotInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!ownerUnlocked || !file) return;

        const finalizeNewImage = (src) => {
          const newImg = document.createElement("img");
          newImg.src = src;
          newImg.alt = "Added tour photo";
          newImg.classList.add("lightbox-item");
          gallery.insertBefore(newImg, slot);
          attachUploadControlToImage(newImg);
          slot.remove();
          slotInput.remove();
          saveImageContent();
          saveAllContent();
        };

        const cloudUrl = await uploadFileToCloud(file, "timeline");
        if (cloudUrl) {
          finalizeNewImage(cloudUrl);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          finalizeNewImage(String(reader.result));
        };
        reader.readAsDataURL(file);
      });
    };

    const addMoreBtn = document.createElement("button");
    addMoreBtn.type = "button";
    addMoreBtn.className = "owner-add-more-btn";
    addMoreBtn.textContent = "Add More Photos";
    card.appendChild(addMoreBtn);

    addMoreBtn.addEventListener("click", () => {
      if (!ownerUnlocked) return;
      createPhotoSlot();
    });
  });
};

loadImageContent();
addUploadButtonsToImages();
addMoreButtonsToTimelineCards();

const addHeroUploadButton = () => {
  if (!heroSection || heroSection.querySelector(".owner-hero-upload-btn")) return;

  const heroBtn = document.createElement("button");
  heroBtn.type = "button";
  heroBtn.className = "owner-hero-upload-btn";
  heroBtn.textContent = "Change Cover";
  heroSection.appendChild(heroBtn);

  const heroInput = document.createElement("input");
  heroInput.type = "file";
  heroInput.accept = "image/*";
  heroInput.style.display = "none";
  heroSection.appendChild(heroInput);

  heroBtn.addEventListener("click", () => {
    if (!ownerUnlocked) return;
    heroInput.click();
  });

  heroInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!ownerUnlocked || !file) return;

    const cloudUrl = await uploadFileToCloud(file, "hero");
    if (cloudUrl) {
      applyHeroImage(cloudUrl);
      localStorage.setItem(HERO_IMAGE_KEY, cloudUrl);
      saveAllContent();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      applyHeroImage(dataUrl);
      localStorage.setItem(HERO_IMAGE_KEY, dataUrl);
      saveAllContent();
    };
    reader.readAsDataURL(file);
  });
};

addHeroUploadButton();

const savedHeroImage = localStorage.getItem(HERO_IMAGE_KEY);
if (heroSection && savedHeroImage) {
  applyHeroImage(savedHeroImage);
}

const initCloudSync = async () => {
  initCloudClient();
  if (!isCloudEnabled) return;

  try {
    const remoteSnapshot = await loadRemoteSnapshot();
    if (remoteSnapshot) {
      applyRemoteSnapshot(remoteSnapshot);
      addUploadButtonsToImages();
      addMoreButtonsToTimelineCards();
      return;
    }

    await saveRemoteSnapshot(getContentSnapshot());
  } catch (error) {
    const cachedRemote = localStorage.getItem(REMOTE_CONTENT_KEY);
    if (!cachedRemote) return;
    try {
      applyRemoteSnapshot(JSON.parse(cachedRemote));
      addUploadButtonsToImages();
      addMoreButtonsToTimelineCards();
    } catch (parseError) {
      // Ignore invalid cache and keep current local content.
    }
  }
};

initCloudSync();

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });
}

const storedTheme = localStorage.getItem("tourBlogTheme");
if (storedTheme === "dark") {
  document.body.classList.add("dark");
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const current = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("tourBlogTheme", current);
  });
}

window.addEventListener("scroll", () => {
  if (window.scrollY > 280) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const revealOnScroll = () => {
  const triggerBottom = window.innerHeight * 0.88;
  revealElements.forEach((el) => {
    const top = el.getBoundingClientRect().top;
    if (top < triggerBottom) {
      el.classList.add("visible");
    }
  });
};

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// Lightbox preview for gallery images
lightboxItems.forEach((image) => {
  image.addEventListener("click", () => {
    lightboxImage.src = image.src;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (!target.classList.contains("lightbox-item")) return;

  lightboxImage.src = target.src;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
});

const closeLightbox = () => {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
};

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});
