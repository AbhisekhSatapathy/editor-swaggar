/**
 * Swagger Editor – Premium Application
 *
 * Initialises CodeMirror editor, Swagger UI preview, toast notifications,
 * theme toggle, search, and all toolbar actions.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   1. Default sample OpenAPI spec loaded on startup
   ═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_SPEC = `openapi: 3.0.3
info:
  title: Petstore API
  description: |
    A sample Pet Store API that demonstrates the core features
    of the Swagger Editor clone.
  version: 1.0.0
  contact:
    name: API Support
    email: support@petstore.example.com
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0

servers:
  - url: https://petstore.swagger.io/v2
    description: Production server
  - url: https://petstore-staging.swagger.io/v2
    description: Staging server

tags:
  - name: pets
    description: Everything about your Pets
  - name: store
    description: Access to the Petstore orders

paths:
  /pets:
    get:
      tags:
        - pets
      summary: List all pets
      description: Returns a list of all pets in the store.
      operationId: listPets
      parameters:
        - name: limit
          in: query
          description: Maximum number of pets to return
          required: false
          schema:
            type: integer
            format: int32
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          description: Filter by pet status
          required: false
          schema:
            type: string
            enum:
              - available
              - pending
              - sold
      responses:
        '200':
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Pet'
              example:
                - id: 1
                  name: Buddy
                  tag: dog
                  status: available
                - id: 2
                  name: Whiskers
                  tag: cat
                  status: pending
        '500':
          description: Unexpected error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    post:
      tags:
        - pets
      summary: Create a new pet
      description: Adds a new pet to the store.
      operationId: createPet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPet'
            example:
              name: Buddy
              tag: dog
      responses:
        '201':
          description: Pet created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid input
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /pets/{petId}:
    get:
      tags:
        - pets
      summary: Get a pet by ID
      description: Returns a single pet by its ID.
      operationId: getPetById
      parameters:
        - name: petId
          in: path
          required: true
          description: The ID of the pet to retrieve
          schema:
            type: integer
            format: int64
      responses:
        '200':
          description: A single pet
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '404':
          description: Pet not found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
    put:
      tags:
        - pets
      summary: Update a pet
      operationId: updatePet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
            format: int64
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewPet'
      responses:
        '200':
          description: Pet updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '404':
          description: Pet not found
    delete:
      tags:
        - pets
      summary: Delete a pet
      operationId: deletePet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: integer
            format: int64
      responses:
        '204':
          description: Pet deleted
        '404':
          description: Pet not found

  /store/inventory:
    get:
      tags:
        - store
      summary: Returns pet inventories by status
      operationId: getInventory
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                type: object
                additionalProperties:
                  type: integer
                  format: int32

components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: integer
          format: int64
          description: Unique identifier for the pet
        name:
          type: string
          description: Name of the pet
        tag:
          type: string
          description: Category tag for the pet
        status:
          type: string
          description: Status of the pet in the store
          enum:
            - available
            - pending
            - sold

    NewPet:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          description: Name of the pet
        tag:
          type: string
          description: Category tag

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
        message:
          type: string
`;

/* ═══════════════════════════════════════════════════════════════════════════
   2. Globals
   ═══════════════════════════════════════════════════════════════════════════ */

let editor = null;
let swaggerUi = null;
let renderTimer = null;
const STORAGE_KEY = 'swagger-editor-yaml';
const THEME_KEY = 'swagger-editor-theme';
const RENDER_DELAY = 600;

/* ═══════════════════════════════════════════════════════════════════════════
   3. Initialisation
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // Initialise Lucide icons
    if (window.lucide) lucide.createIcons();

    applyStoredTheme();
    initEditor();
    initResizer();
    initSearch();
    bindToolbarActions();
    bindThemeSwitch();

    // Load from localStorage or use the default spec
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved || DEFAULT_SPEC;
    editor.setValue(initial);

    // Initial render
    renderSpec(initial);

    // Dismiss page loader
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 500);
        }
    }, 600);
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. CodeMirror Editor
   ═══════════════════════════════════════════════════════════════════════════ */

function initEditor() {
    const container = document.getElementById('editor-container');
    const isDark = document.body.classList.contains('dark-theme');

    editor = CodeMirror(container, {
        mode: 'yaml',
        theme: isDark ? 'material-darker' : 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        tabSize: 2,
        indentWithTabs: false,
        gutters: ['CodeMirror-lint-markers', 'CodeMirror-foldgutter'],
        lint: true,
        foldGutter: true,
        foldOptions: { widget: '…' },
        extraKeys: {
            Tab: (cm) => cm.execCommand('indentMore'),
            'Shift-Tab': (cm) => cm.execCommand('indentLess'),
        },
    });

    // Live preview on change (debounced)
    editor.on('change', () => {
        const value = editor.getValue();
        saveToLocalStorage(value);
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => renderSpec(value), RENDER_DELAY);
    });

    // Active panel glow
    editor.on('focus', () => {
        document.getElementById('editor-panel').classList.add('active-panel');
        document.getElementById('preview-panel').classList.remove('active-panel');
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. Swagger UI Rendering
   ═══════════════════════════════════════════════════════════════════════════ */

function renderSpec(yamlStr) {
    const errorOutput = document.getElementById('error-output');
    const errorCount = document.getElementById('error-count');
    const badge = document.getElementById('validation-badge');
    const spinner = document.getElementById('loading-spinner');
    const container = document.getElementById('swagger-ui-container');

    // Reset
    errorOutput.textContent = '';
    errorOutput.classList.remove('has-error');
    errorCount.style.display = 'none';

    // Empty input – show empty state
    if (!yamlStr.trim()) {
        badge.textContent = '— Empty';
        badge.className = 'badge badge-error';
        showEmptyState(container);
        return;
    }

    // Parse YAML
    let spec;
    try {
        spec = jsyaml.load(yamlStr);
    } catch (err) {
        showError(err);
        showToast('YAML syntax error found', 'error');
        return;
    }

    // Validate
    if (!spec || typeof spec !== 'object') {
        showError(new Error('Document is not a valid OpenAPI object.'));
        return;
    }
    if (!spec.openapi && !spec.swagger) {
        showError(new Error('Missing "openapi" or "swagger" version field.'));
        return;
    }
    if (!spec.info) {
        showError(new Error('Missing required "info" section.'));
        return;
    }
    if (!spec.paths && !spec.webhooks) {
        showError(new Error('Missing required "paths" section.'));
        return;
    }

    // Valid
    badge.textContent = '✓ Valid';
    badge.className = 'badge badge-ok';
    spinner.style.display = '';

    try {
        if (swaggerUi) container.innerHTML = '';

        swaggerUi = SwaggerUIBundle({
            spec,
            dom_id: '#swagger-ui-container',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
            plugins: [SwaggerUIBundle.plugins.DownloadUrl],
            layout: 'StandaloneLayout',
            deepLinking: false,
            showExtensions: true,
            showCommonExtensions: true,
            requestInterceptor: (req) => {
                const originalUrl = req.url;
                req.url = `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
                return req;
            },
        });
    } catch (err) {
        showError(err);
    } finally {
        spinner.style.display = 'none';
    }
}

/** Show an empty state illustration */
function showEmptyState(container) {
    container.innerHTML = `
    <div class="empty-state">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <h3>No API Specification</h3>
      <p>Paste or type your OpenAPI YAML in the editor to see the live documentation preview.</p>
    </div>
  `;
}

/** Display error in the problems console */
function showError(err) {
    const errorOutput = document.getElementById('error-output');
    const errorCount = document.getElementById('error-count');
    const badge = document.getElementById('validation-badge');

    let message = '';
    if (err.mark) {
        message = `Line ${err.mark.line + 1}, Column ${err.mark.column + 1}: ${err.reason || err.message}`;
    } else {
        message = err.message || String(err);
    }

    errorOutput.textContent = message;
    errorOutput.classList.add('has-error');
    errorCount.textContent = '1';
    errorCount.style.display = '';
    badge.textContent = '✗ Error';
    badge.className = 'badge badge-error';
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. Toast Notification System
   ═══════════════════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠',
};

let lastToastMessage = '';
let lastToastTime = 0;

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {number} duration – auto-dismiss ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Deduplicate rapid identical toasts
    const now = Date.now();
    if (message === lastToastMessage && now - lastToastTime < 1500) return;
    lastToastMessage = message;
    lastToastTime = now;

    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" title="Dismiss">✕</button>
  `;

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));

    container.appendChild(toast);

    // Auto-dismiss
    if (duration > 0) {
        setTimeout(() => dismissToast(toast), duration);
    }
}

function dismissToast(toast) {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
}

/** Escape HTML to prevent XSS in toast messages */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. Toolbar Actions
   ═══════════════════════════════════════════════════════════════════════════ */

function bindToolbarActions() {
    // Auto-format YAML
    document.getElementById('btn-format').addEventListener('click', () => {
        try {
            const parsed = jsyaml.load(editor.getValue());
            const formatted = jsyaml.dump(parsed, {
                indent: 2,
                lineWidth: 120,
                noRefs: true,
                sortKeys: false,
            });
            editor.setValue(formatted);
            showToast('YAML formatted successfully', 'success');
        } catch {
            showToast('Cannot format — fix YAML errors first', 'error');
        }
    });

    // Clear editor
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Clear the editor? This cannot be undone.')) {
            editor.setValue('');
            localStorage.removeItem(STORAGE_KEY);
            showToast('Editor cleared', 'info');
        }
    });

    // Download YAML
    document.getElementById('btn-download-yaml').addEventListener('click', () => {
        downloadFile(editor.getValue(), 'openapi.yaml', 'text/yaml');
        showToast('YAML file downloaded', 'success');
    });

    // Download JSON
    document.getElementById('btn-download-json').addEventListener('click', () => {
        try {
            const parsed = jsyaml.load(editor.getValue());
            const json = JSON.stringify(parsed, null, 2);
            downloadFile(json, 'openapi.json', 'application/json');
            showToast('JSON file downloaded', 'success');
        } catch {
            showToast('Cannot convert to JSON — fix YAML errors first', 'error');
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. Theme System
   ═══════════════════════════════════════════════════════════════════════════ */

function bindThemeSwitch() {
    const themeSwitch = document.getElementById('theme-switch');
    themeSwitch.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');

    body.classList.toggle('dark-theme', !isDark);
    body.classList.toggle('light-theme', isDark);

    // Switch CodeMirror theme
    if (editor) editor.setOption('theme', isDark ? 'eclipse' : 'material-darker');

    // Swap toggle icons
    const moonIcon = document.getElementById('theme-icon-moon');
    const sunIcon = document.getElementById('theme-icon-sun');
    if (isDark) {
        moonIcon.style.display = 'none';
        sunIcon.style.display = '';
    } else {
        moonIcon.style.display = '';
        sunIcon.style.display = 'none';
    }

    // Persist
    localStorage.setItem(THEME_KEY, isDark ? 'light' : 'dark');
}

function applyStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');

        const moonIcon = document.getElementById('theme-icon-moon');
        const sunIcon = document.getElementById('theme-icon-sun');
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = '';
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. Panel Resizer
   ═══════════════════════════════════════════════════════════════════════════ */

function initResizer() {
    const resizer = document.getElementById('resizer');
    const editorPanel = document.getElementById('editor-panel');
    const mainContent = document.getElementById('main-content');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const mainRect = mainContent.getBoundingClientRect();
        const newWidth = e.clientX - mainRect.left;
        const minWidth = 300;
        const maxWidth = mainRect.width - 300;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            editorPanel.style.width = `${newWidth}px`;
            editorPanel.style.flex = 'none';
            editor.refresh();
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            editor.refresh();
        }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. Utilities
   ═══════════════════════════════════════════════════════════════════════════ */

function saveToLocalStorage(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // Storage full – silently ignore
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. Search System
   ═══════════════════════════════════════════════════════════════════════════ */

const search = {
    isOpen: false,
    query: '',
    matchCase: false,
    wholeWord: false,
    useRegex: false,
    matches: [],
    currentIndex: -1,
    markers: [],
    currentMarker: null,
};

function initSearch() {
    const searchInput = document.getElementById('search-input');

    // Toggle buttons
    document.getElementById('search-toggle-case').addEventListener('click', () => {
        search.matchCase = !search.matchCase;
        document.getElementById('search-toggle-case').classList.toggle('active', search.matchCase);
        performSearch();
    });

    document.getElementById('search-toggle-word').addEventListener('click', () => {
        search.wholeWord = !search.wholeWord;
        document.getElementById('search-toggle-word').classList.toggle('active', search.wholeWord);
        performSearch();
    });

    document.getElementById('search-toggle-regex').addEventListener('click', () => {
        search.useRegex = !search.useRegex;
        document.getElementById('search-toggle-regex').classList.toggle('active', search.useRegex);
        performSearch();
    });

    document.getElementById('search-prev').addEventListener('click', () => navigateMatch(-1));
    document.getElementById('search-next').addEventListener('click', () => navigateMatch(1));
    document.getElementById('search-close').addEventListener('click', closeSearch);

    searchInput.addEventListener('input', () => {
        search.query = searchInput.value;
        performSearch();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
        if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); return; }
        if (e.altKey) {
            if (e.key === 'c' || e.key === 'C') { e.preventDefault(); document.getElementById('search-toggle-case').click(); }
            else if (e.key === 'w' || e.key === 'W') { e.preventDefault(); document.getElementById('search-toggle-word').click(); }
            else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); document.getElementById('search-toggle-regex').click(); }
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
        if (e.key === 'Escape' && search.isOpen) closeSearch();
    });
}

function openSearch() {
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');

    if (search.isOpen) { searchInput.focus(); searchInput.select(); return; }

    search.isOpen = true;
    searchBar.classList.remove('closing');
    searchBar.style.display = 'flex';

    // Override CodeMirror's Ctrl+F
    editor.setOption('extraKeys', {
        ...editor.getOption('extraKeys'),
        'Cmd-F': () => openSearch(),
        'Ctrl-F': () => openSearch(),
    });

    const selection = editor.getSelection();
    if (selection) { searchInput.value = selection; search.query = selection; }

    searchInput.focus();
    searchInput.select();
    if (search.query) performSearch();
}

function closeSearch() {
    if (!search.isOpen) return;
    const searchBar = document.getElementById('search-bar');
    searchBar.classList.add('closing');
    searchBar.addEventListener('animationend', function handler() {
        searchBar.removeEventListener('animationend', handler);
        searchBar.style.display = 'none';
        searchBar.classList.remove('closing');
        search.isOpen = false;
        clearHighlights();
        editor.focus();
    });
}

function performSearch() {
    clearHighlights();
    search.matches = [];
    search.currentIndex = -1;

    const query = search.query;
    if (!query) { updateSearchCounter(); return; }

    const content = editor.getValue();
    let regex;
    try {
        if (search.useRegex) {
            regex = new RegExp(query, search.matchCase ? 'g' : 'gi');
        } else {
            let escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (search.wholeWord) escaped = `\\b${escaped}\\b`;
            regex = new RegExp(escaped, search.matchCase ? 'g' : 'gi');
        }
    } catch {
        const counter = document.getElementById('search-counter');
        counter.textContent = 'Bad pattern';
        counter.className = 'search-counter no-results';
        return;
    }

    let match;
    while ((match = regex.exec(content)) !== null) {
        if (match[0].length === 0) { regex.lastIndex++; continue; }
        const from = editor.posFromIndex(match.index);
        const to = editor.posFromIndex(match.index + match[0].length);
        search.matches.push({ from, to });
        if (search.matches.length > 10000) break;
    }

    search.matches.forEach((m) => {
        search.markers.push(editor.markText(m.from, m.to, { className: 'cm-search-highlight' }));
    });

    if (search.matches.length > 0) {
        const cursor = editor.getCursor();
        let nearest = 0;
        for (let i = 0; i < search.matches.length; i++) {
            if (CodeMirror.cmpPos(search.matches[i].from, cursor) >= 0) { nearest = i; break; }
            nearest = i;
        }
        search.currentIndex = nearest;
        highlightCurrentMatch();
    }

    updateSearchCounter();
}

function navigateMatch(direction) {
    if (search.matches.length === 0) return;
    if (search.currentMarker) {
        search.currentMarker.clear();
        search.currentMarker = null;
        if (search.currentIndex >= 0 && search.currentIndex < search.matches.length) {
            const m = search.matches[search.currentIndex];
            search.markers[search.currentIndex] = editor.markText(m.from, m.to, { className: 'cm-search-highlight' });
        }
    }
    search.currentIndex += direction;
    if (search.currentIndex >= search.matches.length) search.currentIndex = 0;
    if (search.currentIndex < 0) search.currentIndex = search.matches.length - 1;
    highlightCurrentMatch();
    updateSearchCounter();
}

function highlightCurrentMatch() {
    if (search.currentIndex < 0 || search.currentIndex >= search.matches.length) return;
    const m = search.matches[search.currentIndex];
    if (search.markers[search.currentIndex]) search.markers[search.currentIndex].clear();
    search.currentMarker = editor.markText(m.from, m.to, { className: 'cm-search-highlight-current' });
    editor.scrollIntoView({ from: m.from, to: m.to }, 60);
}

function clearHighlights() {
    search.markers.forEach((m) => { try { m.clear(); } catch { } });
    search.markers = [];
    if (search.currentMarker) { try { search.currentMarker.clear(); } catch { } search.currentMarker = null; }
}

function updateSearchCounter() {
    const counter = document.getElementById('search-counter');
    const prevBtn = document.getElementById('search-prev');
    const nextBtn = document.getElementById('search-next');

    if (!search.query) {
        counter.textContent = 'No results';
        counter.className = 'search-counter';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const total = search.matches.length;
    if (total === 0) {
        counter.textContent = 'No results';
        counter.className = 'search-counter no-results';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    } else {
        counter.textContent = `${search.currentIndex + 1}/${total}`;
        counter.className = 'search-counter has-results';
        prevBtn.disabled = false;
        nextBtn.disabled = false;
    }
}
