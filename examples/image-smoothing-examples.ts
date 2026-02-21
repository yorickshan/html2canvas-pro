/**
 * Image Smoothing Examples for html2canvas-pro
 *
 * This file demonstrates various ways to control image smoothing
 * for different use cases.
 */

import html2canvas from 'html2canvas-pro';

/**
 * Example 1: Pixel Art - Disable Smoothing
 * Perfect for retro games, pixel art, and low-res sprites
 */
export async function capturePixelArt() {
    const element = document.getElementById('pixel-art-container');
    if (!element) return;

    const canvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: false, // Disable smoothing for crisp pixels
        scale: 2 // Upscale 2x without blurring
    });

    return canvas;
}

/**
 * Example 2: High Quality Photo - Enable Smoothing
 * Best for photographs and high-resolution images
 */
export async function capturePhoto() {
    const element = document.getElementById('photo-container');
    if (!element) return;

    const canvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: true,
        imageSmoothingQuality: 'high', // Maximum quality
        scale: 2
    });

    return canvas;
}

/**
 * Example 3: CSS-Controlled Smoothing
 * Use CSS image-rendering property for per-element control
 */
export async function captureMixedContent() {
    /*
    HTML:
    <div id="mixed-content">
        <!-- Pixel art stays crisp -->
        <img src="sprite.png" style="image-rendering: pixelated;" />
        
        <!-- Photo stays smooth -->
        <img src="photo.jpg" style="image-rendering: smooth;" />
    </div>
    */

    const element = document.getElementById('mixed-content');
    if (!element) return;

    // CSS properties are automatically respected
    const canvas = await html2canvas(element as HTMLElement, {
        scale: 2
    });

    return canvas;
}

/**
 * Example 4: Icon Export - Crisp Edges
 * Perfect for UI icons, logos, and vector graphics
 */
export async function captureIcon() {
    const element = document.getElementById('icon');
    if (!element) return;

    const canvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: false,
        scale: 4, // 4x upscale for high-DPI displays
        backgroundColor: null // Transparent background
    });

    return canvas;
}

/**
 * Example 5: Comparison - Side by Side
 * Show the difference between smoothing enabled and disabled
 */
export async function createComparison() {
    const element = document.getElementById('demo-element');
    if (!element) return;

    // Render with smoothing
    const smoothCanvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: true,
        imageSmoothingQuality: 'high'
    });

    // Render without smoothing
    const pixelatedCanvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: false
    });

    return { smoothCanvas, pixelatedCanvas };
}

/**
 * Example 6: Conditional Smoothing Based on Content Type
 * Automatically choose smoothing based on image type
 */
export async function smartCapture(contentType: 'pixel-art' | 'photo' | 'mixed') {
    const element = document.getElementById('content');
    if (!element) return;

    const options = {
        'pixel-art': {
            imageSmoothing: false,
            scale: 2
        },
        photo: {
            imageSmoothing: true,
            imageSmoothingQuality: 'high' as const,
            scale: 1
        },
        mixed: {
            // Let CSS image-rendering property control per element
            scale: 2
        }
    };

    const canvas = await html2canvas(element as HTMLElement, options[contentType]);
    return canvas;
}

/**
 * Example 7: Canvas Element Capture
 * Preserve pixel-perfect rendering of canvas content
 */
export async function captureCanvasElement() {
    const canvasElement = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvasElement) return;

    // Get the canvas context to check for pixel art
    const ctx = canvasElement.getContext('2d');
    const isPixelArt = ctx ? !ctx.imageSmoothingEnabled : false;

    const screenshot = await html2canvas(canvasElement, {
        imageSmoothing: !isPixelArt, // Match the original canvas setting
        scale: 1
    });

    return screenshot;
}

/**
 * Example 8: Download as PNG
 * Export with specific smoothing settings
 */
export async function downloadPixelArt(filename: string = 'pixel-art.png') {
    const element = document.getElementById('content');
    if (!element) return;

    const canvas = await html2canvas(element as HTMLElement, {
        imageSmoothing: false,
        scale: 4, // Large scale for printing/display
        backgroundColor: '#000000'
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}
