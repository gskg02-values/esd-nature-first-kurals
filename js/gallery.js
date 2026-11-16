/**
 * NATURE-FIRST THIRUKKURALS — AUTOMATED ARCHIVE ENGINE
 * 1. Reads archiveData from datas.js.
 * 2. Actively probes images and updates the live Scanning Hall counter.
 * 3. Safeguards text by displaying cards even if images are deleted.
 * 4. Injects fading dividers after every 2 exhibits for breathing space.
 */

document.addEventListener('DOMContentLoaded', () => {
    const MAX_EXHIBITS = 300; 
    const IMAGE_FOLDER = 'assets/images/';
    const EXTENSIONS = ['.jpg', '.JPG', '.jpeg', '.png'];

    const galleryGrid = document.getElementById('gallery-grid');
    const liveExhibitCount = document.getElementById('live-exhibit-count');

    let parsedTextEntries = []; 
    const mountedSpecimens = []; 
    let currentLightboxPos = 0;
    let activeFilterRange = 'all';
    let probesCompleted = 0;

    /* ======================================================================
       1. READ DATAS.JS & PARSE TITLES + TAMIL & ENGLISH KURALS
       ====================================================================== */
    function startArchiveEngine() {
        if (typeof archiveData !== 'undefined') {
            parsedTextEntries = parseDatasTxt(archiveData);
            initializeMuseumWall();
        } else {
            console.error('archiveData variable not found. Make sure datas.js is linked in index.html.');
            initializeMuseumWall(); 
        }
    }

    function parseDatasTxt(rawText) {
        const rawPosts = rawText.split(/---+/);
        const results = [];

        rawPosts.forEach(post => {
            const trimmed = post.trim();
            if (!trimmed) return;

            const chunks = trimmed.split(/\r?\n\s*\r?\n/);
            let title = '', customImage = '', tamil = '', english = '';

            if (chunks.length >= 3) {
                const firstChunkLines = chunks[0].split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                title = firstChunkLines[0] || '';
                if (firstChunkLines.length > 1 && /\.(jpg|jpeg|png|webp)$/i.test(firstChunkLines[1])) {
                    customImage = firstChunkLines[1];
                }
                tamil = chunks[1].trim();
                english = chunks[2].trim();
            } else if (chunks.length === 2) {
                tamil = chunks[0].trim();
                english = chunks[1].trim();
            } else if (chunks.length === 1) {
                const lines = chunks[0].split(/\r?\n/).map(s => s.trim()).filter(Boolean);
                title = lines[0] || '';
                tamil = lines.slice(1, 3).join('\n');
                english = lines.slice(3, 5).join('\n');
            }

            results.push({ title, customImage, tamil, english });
        });

        return results;
    }

    /* ======================================================================
       2. SCAN & MOUNT EXHIBITS IN EXACT ORDER
       ====================================================================== */
    function initializeMuseumWall() {
        const fragment = document.createDocumentFragment();
        const totalToScan = Math.max(MAX_EXHIBITS, parsedTextEntries.length);

        for (let i = 1; i <= totalToScan; i++) {
            const itemSlot = document.createElement('article');
            itemSlot.className = 'exhibit-card';
            itemSlot.dataset.index = i;
            itemSlot.style.display = 'none';
            fragment.appendChild(itemSlot);

            // Inject the fading divider after every 2 items
            if (i % 2 === 0 && i !== totalToScan) {
                const divider = document.createElement('div');
                divider.className = 'row-divider';
                divider.dataset.after = i;
                divider.style.display = 'none'; // Hidden until items mount
                fragment.appendChild(divider);
            }

            probeSpecimenImage(i, 0, itemSlot, totalToScan);
        }

        galleryGrid.appendChild(fragment);
    }

    function probeSpecimenImage(i, extIndex, itemSlot, totalToScan) {
        const textData = parsedTextEntries[i - 1] || null;

        if (extIndex === 0 && textData && textData.customImage) {
            const customTester = new Image();
            customTester.onload = () => mountExhibitCard(i, textData.customImage, textData, itemSlot, totalToScan);
            customTester.onerror = () => probeStandardExtensions(i, 0, textData, itemSlot, totalToScan);
            customTester.src = textData.customImage;
            return;
        }

        probeStandardExtensions(i, extIndex, textData, itemSlot, totalToScan);
    }

    function probeStandardExtensions(i, extIndex, textData, itemSlot, totalToScan) {
        if (extIndex >= EXTENSIONS.length) {
            // *** CRITICAL FIX ***
            // The image file is deleted or missing from the folder.
            // If the user has typed text in datas.js, DO NOT delete the frame!
            if (textData && (textData.tamil || textData.english || textData.title)) {
                // Mount the text and use a default museum placeholder background
                mountExhibitCard(i, 'assets/inquiry-image.jpg', textData, itemSlot, totalToScan);
            } else {
                // No text AND no image. Safe to remove the frame.
                itemSlot.remove();
                checkAllProbesDone(totalToScan);
            }
            return;
        }

        const candidateSrc = `${IMAGE_FOLDER}${i}${EXTENSIONS[extIndex]}`;
        const tester = new Image();

        tester.onload = () => {
            mountExhibitCard(i, candidateSrc, textData, itemSlot, totalToScan);
        };

        tester.onerror = () => {
            probeStandardExtensions(i, extIndex + 1, textData, itemSlot, totalToScan);
        };

        tester.src = candidateSrc;
    }

    function mountExhibitCard(i, imageSrc, textData, itemSlot, totalToScan) {
        const archiveNumber = String(i).padStart(2, '0');
        const title = (textData && textData.title) ? textData.title : `Specimen Archive #${archiveNumber}`;
        const tamil = (textData && textData.tamil) ? textData.tamil : '';
        const english = (textData && textData.english) ? textData.english : '';

itemSlot.innerHTML = `
            <div class="exhibit-frame">
                <div class="exhibit-photo-box">
                    <img src="${imageSrc}" onerror="this.onerror=null; this.src='assets/garden-background-raw.jpg';" alt="${title} - Archive #${archiveNumber}" loading="lazy">
                </div>
            </div>
            <div class="exhibit-archive-no">ARCHIVE # ${archiveNumber}</div>
            <h3 class="exhibit-title">${title}</h3>
            ${tamil ? `<div class="exhibit-tamil">${tamil}</div>` : ''}
            ${english ? `<div class="exhibit-english">${english}</div>` : ''}
        `;

        itemSlot.dataset.mounted = 'true';

        if (isWithinActiveRange(i)) {
            itemSlot.style.display = 'flex';
            
            // Show the divider if this is an even item
            if (i % 2 === 0) {
                const divider = galleryGrid.querySelector(`.row-divider[data-after="${i}"]`);
                if (divider) divider.style.display = 'block';
            }
        }

        mountedSpecimens.push({
            num: i,
            archiveNumber,
            src: imageSrc,
            title,
            tamil,
            english
        });
        mountedSpecimens.sort((a, b) => a.num - b.num);

        itemSlot.addEventListener('click', () => {
            openLightboxByNumber(i);
        });

        updateHeaderCounter();
        checkAllProbesDone(totalToScan);
    }

    function isWithinActiveRange(idx) {
        if (!activeFilterRange || activeFilterRange === 'all') return true;
        const [min, max] = activeFilterRange.split('-').map(Number);
        return idx >= min && idx <= max;
    }

    function updateHeaderCounter() {
        if (liveExhibitCount) {
            liveExhibitCount.textContent = `${mountedSpecimens.length} Archives Mounted`;
        }
    }

    function checkAllProbesDone(totalToScan) {
        probesCompleted++;
        if (probesCompleted === totalToScan && mountedSpecimens.length === 0) {
            if (liveExhibitCount) {
                liveExhibitCount.textContent = `0 Archives Detected`;
            }
            galleryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem; background: #F7F4EB; border: 2px dashed #C29B40; max-width: 680px; margin: 0 auto;">
                    <h3 style="color: #162A1E; font-family: 'Playfair Display', serif; margin-bottom: 0.8rem;">Waiting for Archive Specimens</h3>
                    <p style="color: #1C1B18; font-size: 0.95rem; margin-bottom: 0.6rem;">
                        Add your text to <strong><code>datas.js</code></strong> and place your images in <strong><code>assets/images/</code></strong>.
                    </p>
                </div>
            `;
        }
    }

    /* ======================================================================
       3. CURATORIAL WING TABS & GALLERY FILTER BUTTONS
       ====================================================================== */
    const wingTabs = document.querySelectorAll('.wing-tab');
    const tablets = document.querySelectorAll('.archival-tablet');

    wingTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            wingTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            if (target === 'all') {
                tablets.forEach(tablet => tablet.classList.add('active'));
            } else {
                tablets.forEach(tablet => {
                    tablet.classList.toggle('active', tablet.id === target);
                });
            }
        });
    });

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            activeFilterRange = btn.dataset.range;
            const mountedItems = galleryGrid.querySelectorAll('.exhibit-card[data-mounted="true"]');

            mountedItems.forEach(item => {
                const idx = parseInt(item.dataset.index, 10);
                const isVisible = isWithinActiveRange(idx);
                item.style.display = isVisible ? 'flex' : 'none';
                
                // Toggle the corresponding divider alongside the item when filtering wings
                if (idx % 2 === 0) {
                    const divider = galleryGrid.querySelector(`.row-divider[data-after="${idx}"]`);
                    if (divider) divider.style.display = isVisible ? 'block' : 'none';
                }
            });
        });
    });

    /* ======================================================================
       4. CURATORIAL LIGHTBOX INSPECTION VIEW
       ====================================================================== */
    const lightbox = document.getElementById('art-lightbox');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCat = document.getElementById('lightbox-cat');
    const lightboxTamil = document.getElementById('lightbox-tamil');
    const lightboxEnglish = document.getElementById('lightbox-english');
    const btnClose = document.getElementById('lightbox-close');
    const btnPrev = document.getElementById('lightbox-prev');
    const btnNext = document.getElementById('lightbox-next');

    function openLightboxByNumber(specimenNumber) {
        const pos = mountedSpecimens.findIndex(item => item.num === specimenNumber);
        if (pos === -1) return;
        currentLightboxPos = pos;
        renderLightboxSpecimen();
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function renderLightboxSpecimen() {
        const item = mountedSpecimens[currentLightboxPos];
        lightboxTitle.textContent = item.title;
        lightboxImg.src = item.src;
        lightboxImg.alt = `${item.title} - Archive #${item.archiveNumber}`;
        lightboxCat.textContent = `ARCHIVE # ${item.archiveNumber}`;
        lightboxTamil.textContent = item.tamil;
        lightboxEnglish.textContent = item.english;
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    btnClose.addEventListener('click', closeLightbox);

    btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!mountedSpecimens.length) return;
        currentLightboxPos = (currentLightboxPos - 1 + mountedSpecimens.length) % mountedSpecimens.length;
        renderLightboxSpecimen();
    });

    btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!mountedSpecimens.length) return;
        currentLightboxPos = (currentLightboxPos + 1) % mountedSpecimens.length;
        renderLightboxSpecimen();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') btnPrev.click();
        if (e.key === 'ArrowRight') btnNext.click();
    });

    startArchiveEngine();
});