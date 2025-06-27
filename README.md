# Perceptual Gradient Palette

A web-based color palette generator that creates perceptually uniform gradients using OKLCH color space. Build beautiful, accessible color palettes by defining key colors and extracting precise shades at any lightness level.

![Perceptual Gradient Palette Screenshot](screenshot.png)

## Features

### 🎨 Key Color Management
- **Up to 7 key colors** with hex input (3 or 6 character format)
- **Visual color previews** with real-time updates
- **Lightness display** showing perceptual lightness values (L0-L100)
- **Mute/unmute colors** to temporarily exclude from gradient
- **Auto-sort by lightness** for optimal gradient organization

### 🌈 Perceptual Gradient Generation
- **OKLCH color space** for perceptually uniform gradients
- **Real-time gradient preview** with 600px height
- **Smooth interpolation** between key colors with white/black extensions
- **Visual lightness indicators** showing key color positions
- **Click-to-sample** any point on the gradient

### 🎯 Precision Palette Building
- **Quick lightness input** - Enter L-values (0-100) to instantly add colors
- **Drag indicators** to reposition colors and adjust lightness
- **Editable lightness values** with keyboard shortcuts (Enter, Arrow keys)
- **Auto-sort by lightness** maintains logical color order
- **Visual lightness labels** (L98, L75, L32, etc.)

### 📋 Export & Sharing
- **Copy as SVG** - Export palette as scalable vector graphics
- **Copy as CSS Variables** - Generate CSS custom properties for web development
- **URL persistence** - Share palettes via compact URLs
- **One-click clear** to reset and start fresh

### ⚡ Developer Experience
- **Keyboard shortcuts** for efficient workflow
- **Auto-select inputs** for quick editing
- **Responsive design** works on various screen sizes
- **Modern web standards** with clean, accessible interface

## Usage

### Basic Workflow

1. **Define Key Colors**
   - Enter hex colors in the key color inputs (#FF8800, #0066CC, etc.)
   - Use 3-character shorthand (F08) or full 6-character hex (FF8800)
   - Add up to 7 key colors using the + button

2. **Generate Gradient**
   - The gradient automatically updates as you add/modify colors
   - Key colors are positioned by their perceptual lightness
   - Gradient extends to pure white (top) and pure black (bottom)

3. **Build Palette**
   - **Click anywhere** on the gradient to add that color to your palette
   - **Quick method**: Type lightness values (0-100) in the "L" input and press Enter
   - **Precision editing**: Modify lightness values in palette rows

4. **Export Results**
   - **Copy SVG**: Get vector graphics for design tools
   - **Copy CSS**: Get CSS custom properties for web development
   - **Share URL**: Bookmark or share your palette configuration

### Keyboard Shortcuts

- **Enter**: Expand 3-digit hex (F0A → FF00AA) or add quick lightness color
- **Arrow Up/Down**: Adjust lightness values in palette inputs
- **Tab**: Navigate between inputs efficiently
- **Click input**: Auto-select content for quick replacement

### Advanced Features

#### URL Sharing
Palettes are automatically saved to the URL for easy sharing:
```
?k=FF8800,0066CC&p=ff9933@85,3377dd@45
```
- `k`: Key colors (with muted state support)
- `p`: Palette colors with lightness values

#### CSS Variable Export
Generate ready-to-use CSS custom properties:
```css
:root {
  --color-l95: #FFF2E6;
  --color-l75: #FF9933;
  --color-l45: #3377DD;
  --color-l15: #001122;
}
```

## Technical Details

### Color Science
- **OKLCH Color Space**: Provides perceptually uniform gradients
- **Lightness Accuracy**: True perceptual lightness using Oklab L* values
- **Smooth Interpolation**: Maintains hue and chroma relationships
- **Accessible Contrast**: Predictable lightness relationships for accessibility

### Browser Support
- **Modern browsers** with ES6+ support
- **Chrome, Firefox, Safari, Edge** (latest versions)
- **Mobile responsive** design

### Dependencies
- **Culori.js**: Advanced color manipulation and space conversions
- **Lucide Icons**: Clean, consistent iconography
- **IBM Plex Mono**: Monospace font for precise hex input (optional)

## Installation

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/perceptual-gradient-palette.git
   cd perceptual-gradient-palette
   ```

2. Serve the files using any static server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js
   npx serve .
   
   # Or open index.html directly in your browser
   ```

3. Open `http://localhost:8000` in your browser

### File Structure
```
perceptual-gradient-palette/
├── index.html          # Main application
├── script.js           # Core functionality
├── styles.css          # Application styling
├── culori.min.js       # Color manipulation library
└── README.md           # This file
```

## Use Cases

### Web Development
- Generate consistent color scales for design systems
- Create accessible color palettes with predictable contrast
- Export CSS variables for immediate use in projects

### Design Work
- Build harmonious color schemes based on perceptual uniformity
- Extract precise color values at specific lightness levels
- Create gradients that look natural to human perception

### Accessibility
- Ensure consistent perceptual contrast across color variations
- Generate WCAG-compliant color combinations
- Test color relationships in perceptually uniform space

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development
- The application uses vanilla JavaScript with modern ES6+ features
- CSS uses custom properties for easy theming
- Color calculations rely on the Culori.js library

## Credits

- **Color Science**: Built on [Culori.js](https://culorijs.org/) for accurate color space conversions
- **Icons**: [Lucide Icons](https://lucide.dev/) for clean, consistent UI elements
- **Typography**: [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) for precise hex input display 