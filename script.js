function init() {
    // Initialize the plus icon in the add button
    const addButton = document.getElementById('addKeyColor');
    addButton.innerHTML = '<i data-lucide="plus" size="14"></i>';
    
    // Initialize all Lucide icons (including existing delete buttons)
    lucide.createIcons();

    // Add event listener for the add button
    addButton.addEventListener('click', addKeyColor);

    // Add event listeners for color inputs
    updateColorInputListeners();

    // Initial updates
    updateLightnessLabels();
    updateColorPreviews();
    updateDisplays();
    
    // Ensure delete buttons are properly enabled/disabled
    updateDeleteButtonsState();
}

function updateColorInputListeners() {
    document.querySelectorAll('.color-input-field').forEach(input => {
        input.removeEventListener('input', handleColorInput);
        input.removeEventListener('paste', handlePaste);
        input.addEventListener('input', handleColorInput);
        input.addEventListener('paste', handlePaste);
        
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

function addKeyColor() {
    const colorInputs = document.getElementById('colorInputs');
    const currentCount = colorInputs.children.length;
    
    if (currentCount < 5) {
        const newInput = document.createElement('div');
        newInput.className = 'color-input';
        newInput.dataset.index = currentCount;
        
        newInput.innerHTML = `
            <div class="input-row">
                <label>Key ${currentCount + 1}</label>
                <button class="delete-btn" onclick="deleteColor(${currentCount})">
                    <i data-lucide="x" size="16"></i>
                </button>
            </div>
            <div class="input-group">
                <div class="color-preview"></div>
                <div class="hex-input-wrapper">
                    <span class="hex-prefix">#</span>
                    <input type="text" class="color-input-field" value="" maxlength="6" />
                </div>
            </div>
        `;
        
        colorInputs.appendChild(newInput);
        
        // Initialize Lucide icons for the new elements
        lucide.createIcons();
        
        // Focus the new input field
        const inputField = newInput.querySelector('.color-input-field');
        inputField.focus();
        
        updateColorInputListeners();
        updateAddButtonState();
        updateDeleteButtonsState();
        updateLightnessLabels();
        updateColorPreviews();
    }
}

function deleteColor(index) {
    const colorInputs = document.getElementById('colorInputs');
    if (colorInputs.children.length > 1) {
        colorInputs.children[index].remove();
        // Renumber remaining inputs
        Array.from(colorInputs.children).forEach((input, i) => {
            const color = input.querySelector('.color-input-field').value;
            const lightness = calculateLightness(color);
            input.dataset.index = i;
            input.querySelector('label').textContent = `Key ${i + 1} (${lightness}%)`;
            input.querySelector('.delete-btn').setAttribute('onclick', `deleteColor(${i})`);
        });
        updateAddButtonState();
        updateDeleteButtonsState();
        updateDisplays();
    }
}

function updateAddButtonState() {
    const addButton = document.getElementById('addKeyColor');
    const colorInputs = document.getElementById('colorInputs');
    addButton.disabled = colorInputs.children.length >= 5;
}

function updateDeleteButtonsState() {
    const colorInputs = document.getElementById('colorInputs');
    const inputs = Array.from(colorInputs.children);
    
    // Count valid colors (inputs with 6-character hex values)
    const validColors = inputs.filter(input => {
        const colorValue = input.querySelector('.color-input-field').value;
        return colorValue && colorValue.length === 6;
    });
    
    // Update each delete button
    inputs.forEach(input => {
        const deleteBtn = input.querySelector('.delete-btn');
        const colorValue = input.querySelector('.color-input-field').value;
        const isValidColor = colorValue && colorValue.length === 6;
        
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
    const oklch = culori.oklch(color);
    return oklch ? Math.round(oklch.l * 100) : null;
}

function updateLightnessLabels() {
    document.querySelectorAll('.color-input').forEach((input, i) => {
        const color = input.querySelector('.color-input-field').value;
        const lightness = calculateLightness(color);
        input.querySelector('label').textContent = `Key ${i + 1}${lightness !== null ? ` (${lightness}%)` : ''}`;
    });
}

function updateColorPreviews() {
    document.querySelectorAll('.color-input').forEach(input => {
        const colorValue = input.querySelector('.color-input-field').value;
        const preview = input.querySelector('.color-preview');
        // Set transparent background for empty/invalid colors
        preview.style.backgroundColor = colorValue ? '#' + colorValue : 'transparent';
    });
}

function handleColorInput() {
    const input = this;
    let value = input.value.toUpperCase();
    
    // Only update colors if we have a complete 6-character hex
    if (value.length === 6) {
        updateLightnessLabels();
        updateColorPreviews();
        updateDisplays(); // This should update the gradient
    } else {
        // Clear preview if incomplete
        const preview = input.closest('.color-input').querySelector('.color-preview');
        preview.style.backgroundColor = 'transparent';
    }
}

function updateDisplays() {
    // Only include valid 6-character hex colors
    const colors = Array.from(document.querySelectorAll('.color-input-field'))
        .map(input => input.value)
        .filter(color => color && color.length === 6); // Only include complete colors
    
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
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create wrapper div for positioning
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    
    // Set canvas size
    canvas.width = gradientDisplay.offsetWidth;
    canvas.height = gradientDisplay.offsetHeight;
    
    // Clear and add canvas
    gradientDisplay.innerHTML = '';
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

    if (keyColors.length === 0) return;

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
        tooltip.textContent = `${Math.round(targetLightness * 100)}%`;
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
    
    // Get click position from event
    const rect = canvas.getBoundingClientRect();
    const clickPosition = event.clientY - rect.top;
    
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
        
        // Add lightness
        const lightnessDiv = document.createElement('div');
        lightnessDiv.className = 'palette-lightness';
        lightnessDiv.textContent = `${lightness}%`;
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'palette-delete';
        deleteBtn.innerHTML = '<i data-lucide="x"></i>';
        deleteBtn.addEventListener('click', () => {
            row.remove();
            updatePaletteIndicators();
        });
        
        details.appendChild(hexDiv);
        details.appendChild(lightnessDiv);
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
        gradientDisplay.appendChild(indicator);
    });
    
    lucide.createIcons();
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
        gradientDisplay.appendChild(indicator);
    });
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
        
        // Update lightness value
        const lightnessDiv = item.element.querySelector('.palette-lightness');
        lightnessDiv.textContent = `${lightness}%`;
        
        // Add indicator using the saved position
        const indicator = document.createElement('div');
        indicator.className = 'palette-indicator';
        indicator.style.top = `${item.position - 12}px`;
        indicator.style.backgroundColor = hex;
        // Update threshold to 0.66
        indicator.style.color = color.l > 0.66 ? '#000000' : '#FFFFFF';
        indicator.textContent = index + 1;
        gradientDisplay.appendChild(indicator);
    });
}

// Initialize when the page loads
window.addEventListener('load', () => {
    init();
    // Initialize Lucide icons
    lucide.createIcons();
});

// Update the initial HTML structure to match the new format
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.color-input-field').forEach(input => {
        const value = input.value.replace('#', '');
        input.value = value;
    });
});
