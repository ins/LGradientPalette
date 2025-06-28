// Global flag to prevent URL updates during initialization
let isInitializing = true;

function init() {
    // Initialize the plus icon in the add button
    const addButton = document.getElementById('addKeyColor');
    addButton.innerHTML = '<i data-lucide="plus" size="14"></i>';
    
    // Initialize all Lucide icons (including existing delete buttons)
    lucide.createIcons();

    // Add event listener for the add button
    addButton.addEventListener('click', addKeyColor);

    // Add event listener for the dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    // Add event listener for the sort button
    document.getElementById('sortKeyColors').addEventListener('click', () => {
        const list = [...document.querySelectorAll('.color-input')];
        list.sort((a, b) => {
            const lightnessA = calculateLightness(a.querySelector('.text-input.hex-input').value) || 0;
            const lightnessB = calculateLightness(b.querySelector('.text-input.hex-input').value) || 0;
            return lightnessB - lightnessA; // Sort light to dark (high to low lightness)
        });
        
        // Re-append elements in sorted order
        list.forEach(el => document.getElementById('colorInputs').appendChild(el));
        
        // Update indices and labels after sorting
        list.forEach((input, i) => {
            input.dataset.index = i;
            input.querySelector('.delete-btn').setAttribute('onclick', `deleteColor(${i})`);
        });
        
        updateLightnessLabels();
        updateDeleteButtonsState();
        updateDisplays(); // Update gradient to reflect new order
        updateURL(); // Update URL after sorting
    });

    // Add event listeners for color inputs
    updateColorInputListeners();

    // Load state from URL first, then apply initial updates
    loadFromURL();

    // Initial updates (but don't update URL yet to avoid overwriting loaded state)
    updateLightnessLabels();
    updateColorPreviews();
    updateDisplays();
    
    // Ensure delete buttons are properly enabled/disabled
    updateDeleteButtonsState();
    

    
    // Set up global drag and drop handlers for palette indicators
    setupPaletteDragHandlers();
    
    // Add event listeners for copy buttons
    addCopyButtonListeners();
    
    // Set up quick lightness input
    setupQuickLightnessInput();
    
    // Listen for browser back/forward navigation
    window.addEventListener('popstate', (e) => {
        if (e.state) {
            loadFromURL();
            updateLightnessLabels();
            updateColorPreviews();
            updateDisplays();
            updateDeleteButtonsState();

        }
    });
    
    // Initialize dark mode from localStorage
    initializeDarkMode();
    
    // Mark initialization as complete after a short delay
    setTimeout(() => {
        isInitializing = false;
    }, 200);
}

function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode.toString());
    updateDarkModeIcon(isDarkMode);
}

function updateDarkModeIcon(isDarkMode) {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const icon = darkModeToggle.querySelector('i');
    
    if (isDarkMode) {
        icon.setAttribute('data-lucide', 'moon');
        darkModeToggle.title = 'Switch to light mode';
    } else {
        icon.setAttribute('data-lucide', 'sun');
        darkModeToggle.title = 'Switch to dark mode';
    }
    
    // Reinitialize lucide icons to update the changed icon
    lucide.createIcons();
}

function setupPaletteDragHandlers() {
    const gradientDisplay = document.getElementById('gradientDisplay');
    let isDragging = false;
    let draggedIndicator = null;
    let dragStartY = 0;
    let indicatorStartY = 0;
    
    // Mouse down on indicator starts drag
    gradientDisplay.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('palette-indicator')) {
            isDragging = true;
            draggedIndicator = e.target;
            dragStartY = e.clientY;
            indicatorStartY = parseInt(draggedIndicator.style.top);
            
            // Add visual feedback
            draggedIndicator.style.cursor = 'grabbing';
            draggedIndicator.style.zIndex = '20';
            
            // Prevent text selection
            e.preventDefault();
        }
    });
    
    // Mouse move handles dragging
    document.addEventListener('mousemove', (e) => {
        if (isDragging && draggedIndicator) {
            const gradientWrapper = gradientDisplay.querySelector('div');
            const canvas = gradientWrapper.querySelector('canvas');
            const rect = gradientWrapper.getBoundingClientRect();
            
            // Calculate new Y position (only Y-axis movement)
            const deltaY = e.clientY - dragStartY;
            let newY = indicatorStartY + deltaY + 12; // +12 to account for indicator offset
            
            // Constrain to canvas bounds
            newY = Math.max(0, Math.min(newY, canvas.height));
            
            // Update indicator position immediately (smooth movement)
            draggedIndicator.style.top = `${newY - 12}px`;
            
            // Update the corresponding palette row data
            const rowIndex = parseInt(draggedIndicator.dataset.rowIndex);
            const paletteDisplay = document.getElementById('paletteDisplay');
            const row = paletteDisplay.children[rowIndex];
            
            if (row) {
                row.dataset.position = newY;
                
                            // Update lightness input in real-time
            const lightnessInput = row.querySelector('.text-input.lightness-input');
                if (lightnessInput) {
                    const newLightness = Math.round((1 - newY / canvas.height) * 100);
                    lightnessInput.value = newLightness;
                }
                
                // Update palette colors in real-time
                updatePalette(getActiveKeyColors());
            }
        }
    });
    
    // Mouse up ends drag
    document.addEventListener('mouseup', (e) => {
        if (isDragging && draggedIndicator) {
            // Reset visual feedback
            draggedIndicator.style.cursor = 'move';
            draggedIndicator.style.zIndex = '10';
            
            // Final update to ensure everything is in sync
            updatePaletteIndicators();
            
            // Sort palette colors by lightness after drag
            sortPaletteByLightness();
            
            // Update URL after drag operation
            updateURL();
            
            isDragging = false;
            draggedIndicator = null;
        }
    });
}

function updateColorInputListeners() {
    document.querySelectorAll('.text-input.hex-input').forEach(input => {
        input.removeEventListener('input', handleColorInput);
        input.removeEventListener('paste', handlePaste);
        input.removeEventListener('keydown', handleKeyDown);
        input.addEventListener('input', handleColorInput);
        input.addEventListener('paste', handlePaste);
        input.addEventListener('keydown', handleKeyDown);
        
        // Force uppercase and only allow hex characters
        input.addEventListener('keypress', (e) => {
            const char = String.fromCharCode(e.keyCode || e.which);
            if (!/^[0-9A-F]$/i.test(char)) {
                e.preventDefault();
            }
        });

        // Convert to uppercase on input
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Auto-select content when clicking into the input
        input.addEventListener('focus', () => {
            input.select();
        });
        
        input.addEventListener('click', () => {
            input.select();
        });
    });
}

function handlePaste(e) {
    e.preventDefault();
    let paste = (e.clipboardData || window.clipboardData).getData('text');
    // Remove any '#' character and convert to uppercase
    paste = paste.replace('#', '').toUpperCase();
    // Only allow hex characters
    paste = paste.replace(/[^0-9A-F]/g, '');
    // Limit to 6 characters
    paste = paste.substring(0, 6);
    
    e.target.value = paste;
    
    // Only trigger updates if we have 6 characters
    if (paste.length === 6) {
        handleColorInput.call(e.target);
    }
}

function handleKeyDown(e) {
    // Handle Enter key to expand 3-digit hex to 6-digit
    if (e.key === 'Enter') {
        const input = e.target;
        let value = input.value.toUpperCase();
        
        // If we have exactly 3 characters, expand to 6-digit format
        if (value.length === 3 && /^[0-9A-F]{3}$/i.test(value)) {
            // Expand each character: f0f becomes ff00ff
            const expanded = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
            input.value = expanded;
            
            // Trigger color update
            handleColorInput.call(input);
        }
    }
}

function toggleKeyColor(btn) {
    const card = btn.closest('.color-input');
    
    card.classList.toggle('muted');
    
    // Find the icon element (could be <i> or <svg> after Lucide processing)
    let iconElement = btn.querySelector('i') || btn.querySelector('svg');
    
    // If it's an SVG (already processed by Lucide), we need to recreate the <i> element
    if (iconElement && iconElement.tagName === 'SVG') {
        iconElement.remove();
        iconElement = document.createElement('i');
        btn.appendChild(iconElement);
    }
    
    // Swap icon between eye and eye-off
    if (card.classList.contains('muted')) {
        iconElement.setAttribute('data-lucide', 'eye-off');
    } else {
        iconElement.setAttribute('data-lucide', 'eye');
    }
    
    lucide.createIcons();
    
    // Update displays immediately
    updateDisplays();
    updateURL(); // Update URL when toggling colors
}

function getActiveKeyColors() {
    return [...document.querySelectorAll('.color-input')]
        .filter(c => !c.classList.contains('muted'))
        .map(c => {
            let hex = c.querySelector('.text-input.hex-input').value;
            // Expand 3-digit hex to 6-digit format
            if (hex && hex.length === 3 && /^[0-9A-F]{3}$/i.test(hex)) {
                hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            }
            return hex;
        })
        .filter(h => h && h.length === 6);
}

function addKeyColor() {
    const colorInputs = document.getElementById('colorInputs');
    const currentCount = colorInputs.children.length;
    
    if (currentCount < 7) {
        const newInput = document.createElement('div');
        newInput.className = 'color-input';
        newInput.dataset.index = currentCount;
        
        newInput.innerHTML = `
            <div class="input-row">
                <label>Key ${currentCount + 1}</label>
                <button class="toggle-btn" onclick="toggleKeyColor(this)">
                    <i data-lucide="eye" size="16"></i>
                </button>
                <button class="delete-btn" onclick="deleteColor(${currentCount})">
                    <i data-lucide="x" size="16"></i>
                </button>
            </div>
            <div class="input-group">
                <div class="color-preview"></div>
                <div class="hex-input-wrapper">
                    <span class="hex-prefix">#</span>
                    <input type="text" class="text-input hex-input" value="" maxlength="6" />
                </div>
            </div>
        `;
        
        colorInputs.appendChild(newInput);
        
        // Initialize Lucide icons for the new elements
        lucide.createIcons();
        
        // Focus the new input field
        const inputField = newInput.querySelector('.text-input.hex-input');
        inputField.focus();
        
        updateColorInputListeners();
        updateAddButtonState();
        updateDeleteButtonsState();
        updateLightnessLabels();
        updateColorPreviews();
        updateURL(); // Update URL when adding colors
    }
}

function deleteColor(index) {
    const colorInputs = document.getElementById('colorInputs');
    if (colorInputs.children.length > 1) {
        colorInputs.children[index].remove();
        // Renumber remaining inputs
        Array.from(colorInputs.children).forEach((input, i) => {
            const color = input.querySelector('.text-input.hex-input').value;
            const lightness = calculateLightness(color);
            input.dataset.index = i;
            input.querySelector('label').textContent = `KEY-${i + 1}${lightness !== null ? ` L${lightness}` : ''}`;
            input.querySelector('.delete-btn').setAttribute('onclick', `deleteColor(${i})`);
        });
        updateAddButtonState();
        updateDeleteButtonsState();
        updateDisplays();
        updateURL(); // Update URL when deleting colors
    }
}

function updateAddButtonState() {
    const addButton = document.getElementById('addKeyColor');
    const colorInputs = document.getElementById('colorInputs');
    addButton.disabled = colorInputs.children.length >= 7;
}

function updateDeleteButtonsState() {
    const colorInputs = document.getElementById('colorInputs');
    const inputs = Array.from(colorInputs.children);
    
    // Count valid colors (inputs with 3 or 6-character hex values)
    const validColors = inputs.filter(input => {
        const colorValue = input.querySelector('.text-input.hex-input').value;
        return colorValue && (colorValue.length === 6 || (colorValue.length === 3 && /^[0-9A-F]{3}$/i.test(colorValue)));
    });
    
    // Update each delete button
    inputs.forEach(input => {
        const deleteBtn = input.querySelector('.delete-btn');
        const colorValue = input.querySelector('.text-input.hex-input').value;
        const isValidColor = colorValue && (colorValue.length === 6 || (colorValue.length === 3 && /^[0-9A-F]{3}$/i.test(colorValue)));
        
        // Hide delete button if:
        // 1. It's the only input, OR
        // 2. It's a valid color and there's only one valid color total
        const shouldHide = inputs.length === 1 || (isValidColor && validColors.length === 1);
        
        deleteBtn.disabled = shouldHide;
        deleteBtn.style.visibility = shouldHide ? 'hidden' : 'visible';
    });
}

function calculateLightness(color) {
    if (!color) return null;
    
    // Expand 3-digit hex to 6-digit format
    if (color.length === 3 && /^[0-9A-F]{3}$/i.test(color)) {
        color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }
    
    const oklch = culori.oklch('#' + color);
    return oklch ? Math.round(oklch.l * 100) : null;
}

function updateLightnessLabels() {
    document.querySelectorAll('.color-input').forEach((input, i) => {
        const color = input.querySelector('.text-input.hex-input').value;
        const lightness = calculateLightness(color);
        input.querySelector('label').textContent = `KEY-${i + 1}${lightness !== null ? ` L${lightness}` : ''}`;
    });
}

function updateColorPreviews() {
    document.querySelectorAll('.color-input').forEach(input => {
        let colorValue = input.querySelector('.text-input.hex-input').value;
        const preview = input.querySelector('.color-preview');
        
        // Expand 3-digit hex to 6-digit for preview
        if (colorValue && colorValue.length === 3 && /^[0-9A-F]{3}$/i.test(colorValue)) {
            colorValue = colorValue[0] + colorValue[0] + colorValue[1] + colorValue[1] + colorValue[2] + colorValue[2];
        }
        
        // Set transparent background for empty/invalid colors
        preview.style.backgroundColor = (colorValue && colorValue.length === 6) ? '#' + colorValue : 'transparent';
    });
}

function handleColorInput() {
    const input = this;
    let value = input.value.toUpperCase();
    
    // Update colors if we have a complete 6-character hex or valid 3-character hex
    if (value.length === 6 || (value.length === 3 && /^[0-9A-F]{3}$/i.test(value))) {
        updateLightnessLabels();
        updateColorPreviews();
        updateDisplays(); // This should update the gradient
        updateURL(); // Update URL when colors change
    } else {
        // Clear preview if incomplete
        const preview = input.closest('.color-input').querySelector('.color-preview');
        preview.style.backgroundColor = 'transparent';
    }
}

function updateDisplays() {
    const colors = getActiveKeyColors();
    
    updateGradient(colors);
    updatePalette(colors);
}

function getColorAtPosition(y, stops, canvas) {
    const targetLightness = 1 - (y / canvas.height);
    
    // Find the two stops that this lightness falls between
    for (let i = 1; i < stops.length; i++) {
        if (targetLightness >= stops[i].color.l) {
            const t = (targetLightness - stops[i].color.l) / (stops[i-1].color.l - stops[i].color.l);
            const interpolator = culori.interpolate([stops[i].color, stops[i-1].color], 'oklch');
            return interpolator(t);
        }
    }
    return stops[stops.length - 1].color;
}

function updateGradient(colors) {
    const gradientDisplay = document.getElementById('gradientDisplay');
    
    // Force a complete refresh by clearing everything first
    gradientDisplay.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create wrapper div for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    
    // Set canvas size
    canvas.width = gradientDisplay.offsetWidth;
    canvas.height = gradientDisplay.offsetHeight;
    
    // Add canvas to DOM
    gradientDisplay.appendChild(wrapper);
    wrapper.appendChild(canvas);
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // Convert colors to oklch and sort by lightness
    const keyColors = colors
        .filter(color => color && color.length === 6)
        .map((color, index) => {
            const oklch = culori.oklch('#' + color);
            if (!oklch) return null;
            return {
                color: oklch,
                hex: color,
                index: index + 1,
                position: Math.round((1 - oklch.l) * canvas.height)
            };
        })
        .filter(item => item !== null)
        .sort((a, b) => b.color.l - a.color.l);

    if (keyColors.length === 0) {
        // Clear the canvas if no colors are active
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    // Draw gradient line by line
    for (let y = 0; y < canvas.height; y++) {
        const targetLightness = 1 - (y / canvas.height);
        let color;

        if (targetLightness >= keyColors[0].color.l) {
            // Above highest key color - interpolate to white
            const t = (targetLightness - keyColors[0].color.l) / (1 - keyColors[0].color.l);
            const white = { mode: 'oklch', l: 1, c: 0, h: keyColors[0].color.h };
            const interpolator = culori.interpolate([keyColors[0].color, white], 'oklch');
            color = interpolator(t);
        } else if (targetLightness <= keyColors[keyColors.length - 1].color.l) {
            // Below lowest key color - interpolate to black
            const t = targetLightness / keyColors[keyColors.length - 1].color.l;
            const black = { mode: 'oklch', l: 0, c: 0, h: keyColors[keyColors.length - 1].color.h };
            const interpolator = culori.interpolate([black, keyColors[keyColors.length - 1].color], 'oklch');
            color = interpolator(t);
        } else {
            // Between key colors
            for (let i = 0; i < keyColors.length - 1; i++) {
                if (targetLightness <= keyColors[i].color.l && targetLightness >= keyColors[i + 1].color.l) {
                    const t = (targetLightness - keyColors[i + 1].color.l) / (keyColors[i].color.l - keyColors[i + 1].color.l);
                    const interpolator = culori.interpolate([keyColors[i + 1].color, keyColors[i].color], 'oklch');
                    color = interpolator(t);
                    break;
                }
            }
        }

        if (color) {
            ctx.fillStyle = culori.formatRgb(color);
            ctx.fillRect(0, y, canvas.width, 1);
        }
    }

    // Add indicators for key colors
    keyColors.forEach(keyColor => {
        const indicator = document.createElement('div');
        indicator.className = 'gradient-indicator';
        indicator.style.top = `${keyColor.position - 12}px`;
        indicator.style.backgroundColor = `#${keyColor.hex}`;
        indicator.style.color = keyColor.color.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = keyColor.index;
        wrapper.appendChild(indicator);
    });

    // Add click handler
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const targetLightness = 1 - (y / canvas.height);
        let color;

        if (targetLightness >= keyColors[0].color.l) {
            // Above highest key color - interpolate to white
            const t = (targetLightness - keyColors[0].color.l) / (1 - keyColors[0].color.l);
            const white = { mode: 'oklch', l: 1, c: 0, h: keyColors[0].color.h };
            const interpolator = culori.interpolate([keyColors[0].color, white], 'oklch');
            color = interpolator(t);
        } else if (targetLightness <= keyColors[keyColors.length - 1].color.l) {
            // Below lowest key color - interpolate to black
            const t = targetLightness / keyColors[keyColors.length - 1].color.l;
            const black = { mode: 'oklch', l: 0, c: 0, h: keyColors[keyColors.length - 1].color.h };
            const interpolator = culori.interpolate([black, keyColors[keyColors.length - 1].color], 'oklch');
            color = interpolator(t);
        } else {
            // Between key colors
            for (let i = 0; i < keyColors.length - 1; i++) {
                if (targetLightness <= keyColors[i].color.l && targetLightness >= keyColors[i + 1].color.l) {
                    const t = (targetLightness - keyColors[i + 1].color.l) / (keyColors[i].color.l - keyColors[i + 1].color.l);
                    const interpolator = culori.interpolate([keyColors[i + 1].color, keyColors[i].color], 'oklch');
                    color = interpolator(t);
                    break;
                }
            }
        }

        if (color) {
            const hex = culori.formatHex(color).toUpperCase();
            addColorToPalette(hex, y);
        }
    });

    // Add mousemove handler
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const targetLightness = 1 - (y / canvas.height);
        
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY + 10}px`;
        tooltip.textContent = `L${Math.round(targetLightness * 100)}`;
    });

    // Add both mouseout and mouseleave events
    const hideTooltip = () => {
        tooltip.style.display = 'none';
    };

    canvas.addEventListener('mouseout', hideTooltip);
    canvas.addEventListener('mouseleave', hideTooltip);
    
    // Hide tooltip when window loses focus
    window.addEventListener('blur', hideTooltip);
}

function addColorToPalette(color, y) {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const gradientDisplay = document.querySelector('#gradientDisplay > div');
    const canvas = gradientDisplay.querySelector('canvas');
    
    // Get all colors including the new one, with their positions
    const colors = [...paletteDisplay.children].map(row => ({
        color: row.querySelector('.palette-color').style.backgroundColor,
        position: parseInt(row.dataset.position)
    }));
    
    // Use provided position or get click position from event
    let clickPosition = y;
    if (typeof y === 'undefined' && event) {
        const rect = canvas.getBoundingClientRect();
        clickPosition = event.clientY - rect.top;
    }
    
    colors.push({
        color: color,
        position: clickPosition
    });
    
    // Sort colors by position (top to bottom)
    const sortedColors = colors.sort((a, b) => a.position - b.position);
    
    // Clear and rebuild palette
    paletteDisplay.innerHTML = '';
    
    // Clear existing palette indicators
    gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
    
    // Add sorted colors to palette and create indicators
    sortedColors.forEach((item, index) => {
        const oklch = culori.oklch(item.color);
        const hex = culori.formatHex(item.color).toUpperCase();
        const lightness = Math.round(oklch.l * 100);
        
        // Create row container
        const row = document.createElement('div');
        row.className = 'palette-row';
        row.dataset.position = item.position; // Store the position
        
        // Add color block
        const colorDiv = document.createElement('div');
        colorDiv.className = 'palette-color';
        colorDiv.style.backgroundColor = hex;
        row.appendChild(colorDiv);
        
        // Add details section
        const details = document.createElement('div');
        details.className = 'palette-details';
        
        // Add hex with copy button
        const hexDiv = document.createElement('div');
        hexDiv.className = 'palette-hex';
        hexDiv.innerHTML = `${hex}<i data-lucide="copy"></i>`;
        hexDiv.addEventListener('click', () => {
            // Get the actual color from the color block
            const colorBlock = row.querySelector('.palette-color');
            const actualColor = culori.formatHex(colorBlock.style.backgroundColor).toUpperCase();
            navigator.clipboard.writeText(actualColor);
            hexDiv.classList.add('copied');
            setTimeout(() => {
                hexDiv.classList.remove('copied');
            }, 200);
        });
        
        // Add editable lightness input with L prefix
        const lightnessWrapper = document.createElement('div');
        lightnessWrapper.className = 'palette-lightness-wrapper';
        
        const lightnessPrefix = document.createElement('span');
        lightnessPrefix.className = 'palette-lightness-prefix';
        lightnessPrefix.textContent = 'L';
        
        const lightnessInput = document.createElement('input');
        lightnessInput.type = 'number';
        lightnessInput.className = 'text-input lightness-input';
        lightnessInput.min = '0';
        lightnessInput.max = '100';
        lightnessInput.step = '1';
        lightnessInput.value = lightness;
        
        lightnessWrapper.appendChild(lightnessPrefix);
        lightnessWrapper.appendChild(lightnessInput);
        
        // Handle lightness input changes on Enter and arrow keys only
        lightnessInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const canvas = gradientDisplay.querySelector('canvas');
                if (canvas) {
                    const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
                    row.dataset.position = newPosition;
                    
                    setTimeout(() => {
                        updatePaletteIndicators();
                        updatePalette(getActiveKeyColors());
                        sortPaletteByLightness();
                        updateURL(); // Update URL when palette changes
                    }, 0);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent default arrow behavior
                
                const canvas = gradientDisplay.querySelector('canvas');
                if (canvas) {
                    let currentValue = parseInt(lightnessInput.value) || 0;
                    
                    // Increment or decrement the value
                    if (e.key === 'ArrowUp') {
                        currentValue = Math.min(100, currentValue + 1);
                    } else {
                        currentValue = Math.max(0, currentValue - 1);
                    }
                    
                    // Update the input value
                    lightnessInput.value = currentValue;
                    
                    // Calculate and update position
                    const newPosition = Math.round((1 - currentValue / 100) * canvas.height);
                    row.dataset.position = newPosition;
                    
                    // Use setTimeout to maintain focus after DOM updates
                    setTimeout(() => {
                        updatePaletteIndicators();
                        updatePalette(getActiveKeyColors());
                        sortPaletteByLightness();
                        updateURL(); // Update URL when palette changes
                        
                        // Keep focus on the input after arrow key updates
                        lightnessInput.focus();
                    }, 0);
                }
            }
        });
        
        // Auto-select content when clicking into the input
        lightnessInput.addEventListener('focus', () => {
            lightnessInput.select();
        });
        
        lightnessInput.addEventListener('click', () => {
            lightnessInput.select();
        });
        
        // Also update on blur (when user clicks away or tabs out)
        lightnessInput.addEventListener('blur', () => {
            const canvas = gradientDisplay.querySelector('canvas');
            if (canvas) {
                const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
                row.dataset.position = newPosition;
                updatePaletteIndicators();
                updatePalette(getActiveKeyColors());
                
                // Sort palette colors by lightness after text input change
                sortPaletteByLightness();
                updateURL(); // Update URL when palette changes
            }
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'palette-delete';
        deleteBtn.innerHTML = '<i data-lucide="x"></i>';
        deleteBtn.addEventListener('click', () => {
            row.remove();
            updatePaletteIndicators();
            updateURL(); // Update URL when palette changes
        });
        
        details.appendChild(hexDiv);
        details.appendChild(lightnessWrapper);
        details.appendChild(deleteBtn);
        row.appendChild(details);
        
        paletteDisplay.appendChild(row);
        
        // Add indicator
        const indicator = document.createElement('div');
        indicator.className = 'palette-indicator';
        indicator.style.top = `${item.position - 12}px`;
        indicator.style.backgroundColor = hex;
        // Update threshold to 0.66
        indicator.style.color = oklch.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = index + 1;
        indicator.dataset.rowIndex = index;
        gradientDisplay.appendChild(indicator);
    });
    
    lucide.createIcons();
    updateURL(); // Update URL when adding to palette
}

// Add color to palette by lightness value (for quick lightness input)
function addColorToPaletteByLightness(hex, lightnessValue) {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const gradientDisplay = document.querySelector('#gradientDisplay > div');
    const canvas = gradientDisplay?.querySelector('canvas');
    
    if (!canvas) return;
    
    // Calculate position from lightness value
    const position = Math.round((1 - lightnessValue / 100) * canvas.height);
    
    // Get existing colors with their lightness values
    const existingColors = [...paletteDisplay.children].map(row => {
        const lightnessInput = row.querySelector('.text-input.lightness-input');
        return {
            element: row,
            lightness: parseInt(lightnessInput.value),
            position: parseInt(row.dataset.position)
        };
    });
    
    // Add new color data
    const newColorData = {
        hex: hex,
        lightness: lightnessValue,
        position: position
    };
    
    // Combine existing and new, then sort by lightness (high to low = light to dark)
    const allColors = [...existingColors, newColorData].sort((a, b) => {
        const lightnessA = a.lightness || 0;
        const lightnessB = b.lightness || 0;
        return lightnessB - lightnessA; // Sort light to dark
    });
    
    // Clear palette
    paletteDisplay.innerHTML = '';
    gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
    
    // Rebuild palette in correct order
    allColors.forEach((item, index) => {
        if (item.element) {
            // Existing element - just re-append
            paletteDisplay.appendChild(item.element);
            
            // Update indicator
            const hex = culori.formatHex(item.element.querySelector('.palette-color').style.backgroundColor).toUpperCase();
            const oklch = culori.oklch(hex);
            const indicator = document.createElement('div');
            indicator.className = 'palette-indicator';
            indicator.style.top = `${item.position - 12}px`;
            indicator.style.backgroundColor = hex;
            indicator.style.color = oklch.l > 0.66 ? '#000000' : '#FFFFFF';
            indicator.textContent = index + 1;
            indicator.dataset.rowIndex = index;
            gradientDisplay.appendChild(indicator);
        } else {
            // New element - create it
            createPaletteRow(item.hex, item.lightness, item.position, index, paletteDisplay, gradientDisplay);
        }
    });
    
    lucide.createIcons();
    updateURL();
}

// Helper function to create a single palette row
function createPaletteRow(hex, lightnessValue, position, index, paletteDisplay, gradientDisplay) {
    // Create row container
    const row = document.createElement('div');
    row.className = 'palette-row';
    row.dataset.position = position;
    
    // Add color block
    const colorDiv = document.createElement('div');
    colorDiv.className = 'palette-color';
    colorDiv.style.backgroundColor = hex;
    row.appendChild(colorDiv);
    
    // Add details section
    const details = document.createElement('div');
    details.className = 'palette-details';
    
    // Add hex with copy button
    const hexDiv = document.createElement('div');
    hexDiv.className = 'palette-hex';
    hexDiv.innerHTML = `${hex}<i data-lucide="copy"></i>`;
    hexDiv.addEventListener('click', () => {
        const colorBlock = row.querySelector('.palette-color');
        const actualColor = culori.formatHex(colorBlock.style.backgroundColor).toUpperCase();
        navigator.clipboard.writeText(actualColor);
        hexDiv.classList.add('copied');
        setTimeout(() => {
            hexDiv.classList.remove('copied');
        }, 200);
    });
    
    // Add editable lightness input with L prefix
    const lightnessWrapper = document.createElement('div');
    lightnessWrapper.className = 'palette-lightness-wrapper';
    
    const lightnessPrefix = document.createElement('span');
    lightnessPrefix.className = 'palette-lightness-prefix';
    lightnessPrefix.textContent = 'L';
    
    const lightnessInput = document.createElement('input');
    lightnessInput.type = 'number';
    lightnessInput.className = 'text-input lightness-input';
    lightnessInput.min = '0';
    lightnessInput.max = '100';
    lightnessInput.step = '1';
    lightnessInput.value = lightnessValue;
    
    lightnessWrapper.appendChild(lightnessPrefix);
    lightnessWrapper.appendChild(lightnessInput);
    
    // Handle lightness input changes on Enter and arrow keys only
    lightnessInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const canvas = gradientDisplay.querySelector('canvas');
            if (canvas) {
                const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
                row.dataset.position = newPosition;
                
                setTimeout(() => {
                    updatePaletteIndicators();
                    updatePalette(getActiveKeyColors());
                    sortPaletteByLightness();
                    updateURL();
                }, 0);
            }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            
            const canvas = gradientDisplay.querySelector('canvas');
            if (canvas) {
                let currentValue = parseInt(lightnessInput.value) || 0;
                
                if (e.key === 'ArrowUp') {
                    currentValue = Math.min(100, currentValue + 1);
                } else {
                    currentValue = Math.max(0, currentValue - 1);
                }
                
                lightnessInput.value = currentValue;
                const newPosition = Math.round((1 - currentValue / 100) * canvas.height);
                row.dataset.position = newPosition;
                
                setTimeout(() => {
                    updatePaletteIndicators();
                    updatePalette(getActiveKeyColors());
                    sortPaletteByLightness();
                    updateURL();
                    lightnessInput.focus();
                }, 0);
            }
        }
    });
    
    // Auto-select content when clicking into the input
    lightnessInput.addEventListener('focus', () => {
        lightnessInput.select();
    });
    
    lightnessInput.addEventListener('click', () => {
        lightnessInput.select();
    });
    
    // Also update on blur
    lightnessInput.addEventListener('blur', () => {
        const canvas = gradientDisplay.querySelector('canvas');
        if (canvas) {
            const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
            row.dataset.position = newPosition;
            updatePaletteIndicators();
            updatePalette(getActiveKeyColors());
            sortPaletteByLightness();
            updateURL();
        }
    });
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'palette-delete';
    deleteBtn.innerHTML = '<i data-lucide="x"></i>';
    deleteBtn.addEventListener('click', () => {
        row.remove();
        updatePaletteIndicators();
        updateURL();
    });
    
    details.appendChild(hexDiv);
    details.appendChild(lightnessWrapper);
    details.appendChild(deleteBtn);
    row.appendChild(details);
    
    paletteDisplay.appendChild(row);
    
    // Add indicator
    const oklch = culori.oklch(hex);
    const indicator = document.createElement('div');
    indicator.className = 'palette-indicator';
    indicator.style.top = `${position - 12}px`;
    indicator.style.backgroundColor = hex;
    indicator.style.color = oklch.l > 0.66 ? '#000000' : '#FFFFFF';
    indicator.textContent = index + 1;
    indicator.dataset.rowIndex = index;
    gradientDisplay.appendChild(indicator);
}

// Add this helper function to update indicators when colors are deleted
function updatePaletteIndicators() {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const gradientDisplay = document.querySelector('#gradientDisplay > div');
    
    // Clear existing indicators
    gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
    
    // Add new indicators using saved click positions
    [...paletteDisplay.children].forEach((row, index) => {
        const color = row.querySelector('.palette-color').style.backgroundColor;
        const savedPosition = parseInt(row.dataset.position); // Use the saved click position
        
        const indicator = document.createElement('div');
        indicator.className = 'palette-indicator';
        indicator.style.top = `${savedPosition - 12}px`; // Use exact saved position
        indicator.style.backgroundColor = color;
        
        const oklch = culori.oklch(color);
        // Update threshold to 0.66
        indicator.style.color = oklch.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = index + 1;
        
        // Store the row index as a data attribute for event delegation
        indicator.dataset.rowIndex = index;
        
        gradientDisplay.appendChild(indicator);
    });
}



// Sort palette colors by lightness (light to dark)
function sortPaletteByLightness() {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const rows = [...paletteDisplay.children];
    
    if (rows.length <= 1) return; // No need to sort if 1 or fewer items
    
    // Sort rows by their position (which corresponds to lightness)
    // Lower position = higher lightness (closer to top/white)
    rows.sort((a, b) => {
        const positionA = parseInt(a.dataset.position) || 0;
        const positionB = parseInt(b.dataset.position) || 0;
        return positionA - positionB; // Sort light to dark (low position to high position)
    });
    
    // Re-append rows in sorted order
    rows.forEach(row => paletteDisplay.appendChild(row));
    
    // Update indicators to reflect new order
    updatePaletteIndicators();
}

// Add this function to create gradient stops
function createGradientStops(colors, height) {
    // Convert colors to oklch and sort by lightness
    const keyColors = colors
        .filter(color => color && color.length === 6)
        .map(color => {
            const oklch = culori.oklch('#' + color);
            if (!oklch) return null;
            return {
                color: oklch,
                position: Math.round((1 - oklch.l) * height)
            };
        })
        .filter(item => item !== null)
        .sort((a, b) => a.position - b.position);

    if (keyColors.length === 0) return [];

    const stops = [];
    
    // Add stops for transition to white
    const firstColor = keyColors[0].color;
    const whiteStops = 10;
    for (let i = 0; i <= whiteStops; i++) {
        const t = i / whiteStops;
        const position = Math.round(t * keyColors[0].position);
        stops.push({
            position: position,
            color: {
                mode: 'oklch',
                l: 1 - t * (1 - firstColor.l),
                c: t * firstColor.c,
                h: firstColor.h || 0
            }
        });
    }
    
    // Add key colors
    keyColors.forEach(keyColor => {
        stops.push({
            position: keyColor.position,
            color: keyColor.color
        });
    });
    
    // Add stops for transition to black
    const lastColor = keyColors[keyColors.length - 1].color;
    const blackStops = 10;
    const startPos = keyColors[keyColors.length - 1].position;
    for (let i = 1; i <= blackStops; i++) {
        const t = i / blackStops;
        const position = Math.round(startPos + t * (height - startPos));
        stops.push({
            position: position,
            color: {
                mode: 'oklch',
                l: lastColor.l * (1 - t),
                c: lastColor.c * (1 - t),
                h: lastColor.h || 0
            }
        });
    }

    return stops;
}

// Update the updatePalette function to properly handle the gradient changes
function updatePalette(colors) {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const gradientDisplay = document.querySelector('#gradientDisplay > div');
    
    if (!gradientDisplay || !colors.length) return;
    
    const canvas = gradientDisplay.querySelector('canvas');
    if (!canvas) return;

    // Get existing palette colors with their saved positions
    const existingColors = [...paletteDisplay.children].map(row => ({
        element: row,
        position: parseInt(row.dataset.position)
    }));

    // Clear indicators
    gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
    
    // Only proceed if we have valid colors
    if (existingColors.length === 0) return;

    // Create stops array for color interpolation
    const stops = createGradientStops(colors, canvas.height);
    if (stops.length === 0) return;

    // Update existing colors with new values from gradient
    existingColors.forEach((item, index) => {
        const color = getColorAtPosition(item.position, stops, canvas);
        const hex = culori.formatHex(color).toUpperCase();
        const lightness = Math.round(color.l * 100);
        
        // Update color block
        const colorDiv = item.element.querySelector('.palette-color');
        colorDiv.style.backgroundColor = hex;
        
        // Update hex value
        const hexDiv = item.element.querySelector('.palette-hex');
        hexDiv.firstChild.textContent = hex;
        
        // Update lightness input value
        const lightnessInput = item.element.querySelector('.text-input.lightness-input');
        if (lightnessInput) {
            lightnessInput.value = lightness;
        }
        
        // Add indicator using the saved position
        const indicator = document.createElement('div');
        indicator.className = 'palette-indicator';
        indicator.style.top = `${item.position - 12}px`;
        indicator.style.backgroundColor = hex;
        // Update threshold to 0.66
        indicator.style.color = color.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = index + 1;
        indicator.dataset.rowIndex = index;
        gradientDisplay.appendChild(indicator);
    });
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function addCopyButtonListeners() {
    document.getElementById('copySVG').addEventListener('click', () => {
        const rows = [...document.querySelectorAll('.palette-row')];
        if (rows.length === 0) return;
        const rects = rows.map((r, i) => `<rect x="0" y="${i * 40}" width="120" height="40" fill="${r.querySelector('.palette-color').style.backgroundColor}" id="L${r.querySelector('.text-input.lightness-input').value}"/>`).join('');
        navigator.clipboard.writeText(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="${rows.length * 40}">${rects}</svg>`);
        showToast('SVG Copied!');
    });

    document.getElementById('copyFigma').addEventListener('click', () => {
        const rows = [...document.querySelectorAll('.palette-row')];
        if (rows.length === 0) return;
        
        // Create CSS custom properties (variables)
        const cssVariables = rows.map(r => {
            const backgroundColor = r.querySelector('.palette-color').style.backgroundColor;
            if (!backgroundColor) return null;

            const hex = culori.formatHex(backgroundColor).toUpperCase();
            const lightness = r.querySelector('.text-input.lightness-input').value;
            
            return `  --color-l${lightness}: ${hex};`;
        }).filter(Boolean);

        if (cssVariables.length === 0) return;

        // Create complete CSS with root selector
        const cssOutput = `:root {\n${cssVariables.join('\n')}\n}\n\n/* Usage examples:\nbackground-color: var(--color-l${rows[0]?.querySelector('.text-input.lightness-input').value || '100'});\ncolor: var(--color-l${rows[rows.length-1]?.querySelector('.text-input.lightness-input').value || '0'});\n*/`;
        
        // Copy CSS variables to clipboard
        navigator.clipboard.writeText(cssOutput).then(() => {
            showToast('CSS Variables Copied!');
        }).catch(err => {
            console.error('Failed to copy CSS variables:', err);
            showToast('Copy failed - check console');
            console.log('CSS Variables:');
            console.log(cssOutput);
        });
    });

    document.getElementById('clearPalette').addEventListener('click', () => {
        const paletteDisplay = document.getElementById('paletteDisplay');
        const gradientDisplay = document.querySelector('#gradientDisplay > div');
        
        // Clear all palette rows
        paletteDisplay.innerHTML = '';
        
        // Clear all palette indicators
        if (gradientDisplay) {
            gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
        }
        
        // Update URL to reflect cleared state
        updateURL();
        
        showToast('Palette Cleared!');
    });
}

function setupQuickLightnessInput() {
    const quickInput = document.getElementById('quickLightnessInput');
    
    if (!quickInput) return;
    
    // Handle Enter key to add palette color
    quickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const lightnessValue = parseInt(quickInput.value);
            
            // Validate lightness value
            if (isNaN(lightnessValue) || lightnessValue < 0 || lightnessValue > 100) {
                return;
            }
            
            // Check if we have active key colors
            const activeColors = getActiveKeyColors();
            if (activeColors.length === 0) {
                return;
            }
            
            // Get gradient display and canvas
            const gradientDisplay = document.querySelector('#gradientDisplay > div');
            const canvas = gradientDisplay?.querySelector('canvas');
            
            if (!canvas) {
                return;
            }
            
            // Calculate position from lightness value
            const position = Math.round((1 - lightnessValue / 100) * canvas.height);
            
            // Create gradient stops to get the color at this position
            const stops = createGradientStops(activeColors, canvas.height);
            if (stops.length === 0) return;
            
            // Get color at the calculated position
            const color = getColorAtPosition(position, stops, canvas);
            const hex = culori.formatHex(color).toUpperCase();
            
            // Add the color to the palette directly without position-based sorting
            addColorToPaletteByLightness(hex, lightnessValue);
            
            // Clear and auto-select the input for next entry
            quickInput.value = '';
            quickInput.select();
        }
    });
    
    // Auto-select content when clicking into the input
    quickInput.addEventListener('focus', () => {
        quickInput.select();
    });
    
    quickInput.addEventListener('click', () => {
        quickInput.select();
    });
    
    // Validate input range as user types
    quickInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        if (!isNaN(value)) {
            if (value < 0) e.target.value = 0;
            if (value > 100) e.target.value = 100;
        }
    });
}

// Initialize when the page loads
window.addEventListener('load', () => {
    init();
    // Initialize Lucide icons
    lucide.createIcons();
});

// URL Persistence Functions
function updateURL() {
    // Don't update URL during initialization to preserve loaded state
    if (isInitializing) {
        return;
    }
    
    try {
        const state = getCurrentState();
        const urlParams = new URLSearchParams();
        
        // Encode key colors
        if (state.keyColors.length > 0) {
            const keyColorsParam = state.keyColors.map(c => `${c.color}${c.muted ? 'm' : ''}`).join(',');
            urlParams.set('k', keyColorsParam);
        }
        
        // Encode palette colors
        if (state.paletteColors.length > 0) {
            const paletteParam = state.paletteColors.map(c => `${c.color}@${c.lightness}`).join(',');
            urlParams.set('p', paletteParam);
        }
        
        // Update URL without triggering page reload
        const newUrl = urlParams.toString() ? 
            `${window.location.pathname}?${urlParams.toString()}` : 
            window.location.pathname;
        
        window.history.replaceState(state, '', newUrl);
    } catch (error) {
        console.warn('Failed to update URL:', error);
    }
}

function loadFromURL() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Load key colors
        const keyColorsParam = urlParams.get('k');
        if (keyColorsParam) {
            loadKeyColorsFromParam(keyColorsParam);
        }
        
        // Load palette colors (after a short delay to ensure gradient is ready)
        const paletteParam = urlParams.get('p');
        if (paletteParam) {
            setTimeout(() => {
                loadPaletteFromParam(paletteParam);
            }, 100);
        }
    } catch (error) {
        console.warn('Failed to load from URL:', error);
    }
}

function getCurrentState() {
    const keyColors = [...document.querySelectorAll('.color-input')].map(input => ({
        color: input.querySelector('.text-input.hex-input').value || '',
        muted: input.classList.contains('muted')
    })).filter(c => c.color.trim());
    
    const paletteColors = [...document.querySelectorAll('.palette-row')].map(row => {
        try {
            const colorElement = row.querySelector('.palette-color');
            const lightnessElement = row.querySelector('.text-input.lightness-input');
            
            if (!colorElement || !lightnessElement) {
                return null;
            }
            
            const backgroundColor = colorElement.style.backgroundColor;
            if (!backgroundColor) {
                return null;
            }
            
            const color = culori.formatHex(backgroundColor).replace('#', '');
            const lightness = parseInt(lightnessElement.value);
            
            if (!color || isNaN(lightness)) {
                return null;
            }
            
            return { color, lightness };
        } catch (error) {
            return null;
        }
    }).filter(Boolean);
    
    return { keyColors, paletteColors };
}

function loadKeyColorsFromParam(param) {
    const colorInputs = document.getElementById('colorInputs');
    
    // Clear existing inputs except the first one
    while (colorInputs.children.length > 1) {
        colorInputs.removeChild(colorInputs.lastChild);
    }
    
    // Decode URL-encoded parameter and split by comma
    const decodedParam = decodeURIComponent(param);
    const colors = decodedParam.split(',').filter(c => c.trim());
    
    colors.forEach((colorData, index) => {
        const trimmedColor = colorData.trim();
        const isMuted = trimmedColor.endsWith('m');
        const color = isMuted ? trimmedColor.slice(0, -1) : trimmedColor;
        
        // Validate hex color (3 or 6 characters)
        if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(color)) {
            return;
        }
        
        // Add new input if needed
        if (index >= colorInputs.children.length) {
            addKeyColor();
        }
        
        const input = colorInputs.children[index];
        if (input) {
            const colorField = input.querySelector('.text-input.hex-input');
            colorField.value = color.toUpperCase();
            
            // Set muted state
            if (isMuted) {
                input.classList.add('muted');
                const toggleBtn = input.querySelector('.toggle-btn');
                let iconElement = toggleBtn.querySelector('i') || toggleBtn.querySelector('svg');
                if (iconElement && iconElement.tagName === 'SVG') {
                    iconElement.remove();
                    iconElement = document.createElement('i');
                    toggleBtn.appendChild(iconElement);
                }
                iconElement.setAttribute('data-lucide', 'eye-off');
                lucide.createIcons();
            }
        }
    });
}

function loadPaletteFromParam(param) {
    const paletteDisplay = document.getElementById('paletteDisplay');
    const gradientDisplay = document.querySelector('#gradientDisplay > div');
    
    if (!gradientDisplay) return;
    
    const canvas = gradientDisplay.querySelector('canvas');
    if (!canvas) return;
    
    // Clear existing palette
    paletteDisplay.innerHTML = '';
    gradientDisplay.querySelectorAll('.palette-indicator').forEach(el => el.remove());
    
    // Decode URL-encoded parameter and split by comma
    const decodedParam = decodeURIComponent(param);
    const colors = decodedParam.split(',').filter(c => c.trim() && c.includes('@'));
    
    colors.forEach((colorData, index) => {
        const trimmedColorData = colorData.trim();
        const [color, lightness] = trimmedColorData.split('@');
        
        // Validate hex color and lightness
        if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(color)) {
            return;
        }
        
        const lightnessValue = parseInt(lightness);
        if (isNaN(lightnessValue) || lightnessValue < 0 || lightnessValue > 100) {
            return;
        }
        
        const position = Math.round((1 - lightnessValue / 100) * canvas.height);
        
        // Create row container
        const row = document.createElement('div');
        row.className = 'palette-row';
        row.dataset.position = position;
        
        // Add color block
        const colorDiv = document.createElement('div');
        colorDiv.className = 'palette-color';
        colorDiv.style.backgroundColor = '#' + color;
        row.appendChild(colorDiv);
        
        // Add details section
        const details = document.createElement('div');
        details.className = 'palette-details';
        
        // Add hex with copy button
        const hexDiv = document.createElement('div');
        hexDiv.className = 'palette-hex';
        hexDiv.innerHTML = `#${color.toUpperCase()}<i data-lucide="copy"></i>`;
        hexDiv.addEventListener('click', () => {
            const colorBlock = row.querySelector('.palette-color');
            const actualColor = culori.formatHex(colorBlock.style.backgroundColor).toUpperCase();
            navigator.clipboard.writeText(actualColor);
            hexDiv.classList.add('copied');
            setTimeout(() => {
                hexDiv.classList.remove('copied');
            }, 200);
        });
        
        // Add editable lightness input with L prefix
        const lightnessWrapper = document.createElement('div');
        lightnessWrapper.className = 'palette-lightness-wrapper';
        
        const lightnessPrefix = document.createElement('span');
        lightnessPrefix.className = 'palette-lightness-prefix';
        lightnessPrefix.textContent = 'L';
        
        const lightnessInput = document.createElement('input');
        lightnessInput.type = 'number';
        lightnessInput.className = 'text-input lightness-input';
        lightnessInput.min = '0';
        lightnessInput.max = '100';
        lightnessInput.step = '1';
        lightnessInput.value = lightnessValue;
        
        lightnessWrapper.appendChild(lightnessPrefix);
        lightnessWrapper.appendChild(lightnessInput);
        
        // Handle lightness input changes on Enter and arrow keys only
        lightnessInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const canvas = gradientDisplay.querySelector('canvas');
                if (canvas) {
                    const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
                    row.dataset.position = newPosition;
                    
                    setTimeout(() => {
                        updatePaletteIndicators();
                        updatePalette(getActiveKeyColors());
                        sortPaletteByLightness();
                        updateURL(); // Update URL when palette changes
                    }, 0);
                }
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent default arrow behavior
                
                const canvas = gradientDisplay.querySelector('canvas');
                if (canvas) {
                    let currentValue = parseInt(lightnessInput.value) || 0;
                    
                    // Increment or decrement the value
                    if (e.key === 'ArrowUp') {
                        currentValue = Math.min(100, currentValue + 1);
                    } else {
                        currentValue = Math.max(0, currentValue - 1);
                    }
                    
                    // Update the input value
                    lightnessInput.value = currentValue;
                    
                    // Calculate and update position
                    const newPosition = Math.round((1 - currentValue / 100) * canvas.height);
                    row.dataset.position = newPosition;
                    
                    // Use setTimeout to maintain focus after DOM updates
                    setTimeout(() => {
                        updatePaletteIndicators();
                        updatePalette(getActiveKeyColors());
                        sortPaletteByLightness();
                        updateURL(); // Update URL when palette changes
                        
                        // Keep focus on the input after arrow key updates
                        lightnessInput.focus();
                    }, 0);
                }
            }
        });
        
        // Auto-select content when clicking into the input
        lightnessInput.addEventListener('focus', () => {
            lightnessInput.select();
        });
        
        lightnessInput.addEventListener('click', () => {
            lightnessInput.select();
        });
        
        // Also update on blur (when user clicks away or tabs out)
        lightnessInput.addEventListener('blur', () => {
            const canvas = gradientDisplay.querySelector('canvas');
            if (canvas) {
                const newPosition = Math.round((1 - lightnessInput.value / 100) * canvas.height);
                row.dataset.position = newPosition;
                updatePaletteIndicators();
                updatePalette(getActiveKeyColors());
                
                // Sort palette colors by lightness after text input change
                sortPaletteByLightness();
                updateURL(); // Update URL when palette changes
            }
        });
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'palette-delete';
        deleteBtn.innerHTML = '<i data-lucide="x"></i>';
        deleteBtn.addEventListener('click', () => {
            row.remove();
            updatePaletteIndicators();
            updateURL();
        });
        
        details.appendChild(hexDiv);
        details.appendChild(lightnessWrapper);
        details.appendChild(deleteBtn);
        row.appendChild(details);
        
        paletteDisplay.appendChild(row);
        
        // Add indicator
        const indicator = document.createElement('div');
        indicator.className = 'palette-indicator';
        indicator.style.top = `${position - 12}px`;
        indicator.style.backgroundColor = '#' + color;
        
        const oklch = culori.oklch('#' + color);
        indicator.style.color = oklch.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = index + 1;
        indicator.dataset.rowIndex = index;
        gradientDisplay.appendChild(indicator);
    });
    
    lucide.createIcons();
}

// Update the initial HTML structure to match the new format
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.text-input.hex-input').forEach(input => {
        const value = input.value.replace('#', '');
        input.value = value;
    });
});
